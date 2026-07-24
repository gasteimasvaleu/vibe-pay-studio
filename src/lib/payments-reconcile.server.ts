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
    payment_method: "pix",
    provider: "asaas",
    provider_ref: providerRef,
  });
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
      await creditWalletTopup(
        supabaseAdmin,
        meta.buyerId,
        meta.amountCents,
        providerRef,
      );
    }
  } else if (meta.referenceId) {
    await markStatusPaid(
      supabaseAdmin,
      meta.referenceTable,
      meta.referenceId,
      providerRef,
    );

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
