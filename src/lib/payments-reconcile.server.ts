// Reconcile logic for paid Asaas payments.
// Shared between the webhook (`/api/public/webhooks/asaas`) and the
// `getPaymentIntentStatus` poller so both paths converge on the same DB writes.
//
// Idempotent: only acts if the intent's `processed_at` is null. Safe to call
// multiple times; the second call is a no-op.

type SupabaseAdminLike = any;

export type PaidIntent = {
  id: string;
  processed_at: string | null;
  metadata: unknown;
};


type ReferenceTable =
  | "publication_unlocks"
  | "subscriptions"
  | "tips"
  | "chat_message_unlocks"
  | "video_calls"
  | "chat_media_requests"
  | "story_unlocks"
  | "live_tickets"
  | "wallet_topups";



async function markStatusPaid(
  supabaseAdmin: SupabaseAdminLike,
  table: Exclude<ReferenceTable, "wallet_topups">,
  id: string,
  providerRef: string,
) {
  const statusColumn = table === "video_calls" ? "payment_status" : "status";
  const mapped = table === "subscriptions" ? "active" : "paid";
  const { error } = await supabaseAdmin
    .from(table)
    .update({ [statusColumn]: mapped, provider_ref: providerRef })
    .eq("id", id);
  if (error) {
    throw new Error(
      `markStatusPaid failed [${table}#${id}]: ${error.message ?? error}`,
    );
  }
}


async function creditWalletTopup(
  supabaseAdmin: SupabaseAdminLike,
  buyerId: string,
  amountCents: number,
  providerRef: string,
  paymentMethod: "pix" | "credit_card" | "boleto" = "pix",
) {
  // dedupe: if a transaction with this provider_ref already exists, skip
  const { data: existing } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("provider_ref", providerRef)
    .eq("kind", "wallet_topup")
    .maybeSingle();
  if (existing) return;

  await supabaseAdmin.from("transactions").insert({
    kind: "wallet_topup",
    status: "paid",
    buyer_id: buyerId,
    amount_cents_gross: amountCents,
    platform_fee_cents: 0,
    net_cents: amountCents,
    commission_pct_applied: 0,
    payment_method: paymentMethod,
    provider: "asaas",
    provider_ref: providerRef,
  });
}

function mapBillingType(t?: string | null): "pix" | "credit_card" | "boleto" {
  const v = String(t ?? "").toUpperCase();
  if (v === "CREDIT_CARD") return "credit_card";
  if (v === "BOLETO") return "boleto";
  return "pix";
}

/**
 * Apply the "paid" side-effects for a given `payment_intents` row.
 * Marks the reference row as paid (or credits wallet), then stamps the intent.
 *
 * @returns true when reconciliation ran, false when skipped (already processed
 *          or missing metadata).
 */
export async function applyPaidIntent(
  supabaseAdmin: SupabaseAdminLike,
  intent: PaidIntent,
  providerRef: string,
  eventType = "POLLER_RECONCILED",
): Promise<boolean> {
  if (intent.processed_at) return false;

  const meta = (intent.metadata ?? {}) as {
    referenceTable?: ReferenceTable;
    referenceId?: string;
    buyerId?: string;
    amountCents?: number;
    supersedesSubscriptionId?: string;
    recurringCycle?: boolean;
    plan?: "monthly" | "quarterly" | "semiannual";
  };

  if (!meta.referenceTable) {
    // nothing to reconcile — still stamp the intent so we don't loop
    await supabaseAdmin
      .from("payment_intents")
      .update({ processed_at: new Date().toISOString(), event_type: eventType })
      .eq("id", intent.id);
    return false;
  }

  if (meta.referenceTable === "wallet_topups") {
    if (meta.buyerId && meta.amountCents) {
      const { data: pi } = await supabaseAdmin
        .from("payment_intents")
        .select("method, payload")
        .eq("id", intent.id)
        .maybeSingle();
      const billing = (pi as any)?.payload?.billingType ?? (pi as any)?.payload?.payment?.billingType ?? (pi as any)?.method;
      await creditWalletTopup(
        supabaseAdmin,
        meta.buyerId,
        meta.amountCents,
        providerRef,
        mapBillingType(billing),
      );
    }
  } else if (meta.referenceId) {
    await markStatusPaid(
      supabaseAdmin,
      meta.referenceTable,
      meta.referenceId,
      providerRef,
    );

    // Ciclo recorrente do Asaas: estende current_period_end em +1 ciclo
    // a partir do atual (ou de hoje, se já venceu) para preservar o
    // acesso contínuo do assinante.
    if (meta.referenceTable === "subscriptions" && meta.recurringCycle && meta.plan) {
      try {
        const monthsByPlan = { monthly: 1, quarterly: 3, semiannual: 6 } as const;
        const months = monthsByPlan[meta.plan] ?? 1;
        const { data: cur } = await supabaseAdmin
          .from("subscriptions")
          .select("current_period_end")
          .eq("id", meta.referenceId)
          .maybeSingle();
        const base = cur?.current_period_end
          ? new Date(cur.current_period_end as string).getTime()
          : Date.now();
        const from = Math.max(base, Date.now());
        const nextEnd = new Date(from + months * 30 * 86400_000).toISOString();
        await supabaseAdmin
          .from("subscriptions")
          .update({
            current_period_end: nextEnd,
            reminder_sent_at: null,
            auto_renew: true,
          })
          .eq("id", meta.referenceId);
      } catch (err) {
        console.error("[reconcile] extend recurring period failed", err);
      }
    }

    // Upgrade de assinatura: marca a assinatura antiga como substituída
    // (o novo current_period_end já foi calculado somando o tempo restante).
    if (meta.referenceTable === "subscriptions" && meta.supersedesSubscriptionId) {
      try {
        // Carrega o asaas_subscription_id antigo para cancelar a recorrência.
        const { data: oldSub } = await supabaseAdmin
          .from("subscriptions")
          .select("asaas_subscription_id")
          .eq("id", meta.supersedesSubscriptionId)
          .maybeSingle();
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "superseded",
            auto_renew: false,
            cancelled_at: new Date().toISOString(),
          })
          .eq("id", meta.supersedesSubscriptionId);
        const oldAsaasId = oldSub?.asaas_subscription_id as string | null;
        if (oldAsaasId) {
          try {
            const asaas = await import("./asaas.server");
            await asaas.deleteAsaasSubscription(oldAsaasId);
          } catch (err) {
            console.warn("[reconcile] falha ao cancelar assinatura antiga no Asaas", err);
          }
        }
      } catch (err) {
        console.error("[reconcile] supersede subscription failed", err);
      }
    }

    // Fire-and-forget email notifications (never blocks reconcile).
    try {
      const events = await import("./email-events.server");
      if (meta.referenceTable === "publication_unlocks") {
        await events.notifyPublicationUnlock(meta.referenceId);
      } else if (meta.referenceTable === "chat_message_unlocks") {
        await events.notifyChatUnlock(meta.referenceId);
      } else if (meta.referenceTable === "subscriptions") {
        await events.notifySubscriptionActive(meta.referenceId);
      }
    } catch (err) {
      console.error("[reconcile] email dispatch failed", err);
    }
  }

  await supabaseAdmin
    .from("payment_intents")
    .update({ processed_at: new Date().toISOString(), event_type: eventType })
    .eq("id", intent.id);

  return true;
}
