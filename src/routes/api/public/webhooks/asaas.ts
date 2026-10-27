import { createFileRoute } from "@tanstack/react-router";

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: {
    id: string;
    status: string;
    value?: number;
    netValue?: number;
    dueDate?: string;
    invoiceUrl?: string | null;
    subscription?: string | null;
    externalReference?: string | null;
  };
  transfer?: {
    id: string;
    status?: string;
    externalReference?: string | null;
    failReason?: string | null;
    description?: string | null;
  };
  subscription?: {
    id: string;
    status?: string;
    externalReference?: string | null;
  };
};

const SUBSCRIPTION_SPLIT_EVENTS = new Set([
  "SUBSCRIPTION_SPLIT_DISABLED",
  "SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK",
  "SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK_FINISHED",
]);


type WithdrawalStatus =
  | "requested"
  | "in_review"
  | "approved"
  | "paid"
  | "rejected"
  | "failed";

const TRANSFER_STATUS_MAP: Record<string, WithdrawalStatus> = {
  TRANSFER_CREATED: "requested",
  TRANSFER_PENDING: "approved",
  TRANSFER_IN_BANK_PROCESSING: "approved",
  TRANSFER_BLOCKED: "in_review",
  TRANSFER_DONE: "paid",
  TRANSFER_FAILED: "failed",
  TRANSFER_CANCELLED: "rejected",
};


const TERMINAL_PAID = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
const TERMINAL_REFUNDED = new Set([
  "PAYMENT_REFUNDED",
  "PAYMENT_REFUND_IN_PROGRESS",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
]);
const TERMINAL_CANCELLED = new Set([
  "PAYMENT_DELETED",
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUND_DENIED",
]);
const TERMINAL_AUTHORIZED = new Set(["PAYMENT_AUTHORIZED"]);
const RISK_PENDING = new Set(["PAYMENT_AWAITING_RISK_ANALYSIS"]);
const RISK_APPROVED = new Set(["PAYMENT_APPROVED_BY_RISK_ANALYSIS"]);
const RISK_REPROVED = new Set(["PAYMENT_REPROVED_BY_RISK_ANALYSIS"]);
const TERMINAL_PARTIAL_REFUND = new Set(["PAYMENT_PARTIALLY_REFUNDED"]);
const SPLIT_EVENTS = new Set([
  "PAYMENT_SPLIT_CANCELLED",
  "PAYMENT_SPLIT_DIVERGENCE_BLOCK",
  "PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED",
]);

type TargetStatus =
  | "paid"
  | "refunded"
  | "cancelled"
  | "authorized"
  | "in_analysis"
  | "partially_refunded";

async function markStatus(
  supabaseAdmin: any,
  table: string,
  id: string,
  status: TargetStatus,
  providerRef: string,
) {
  const statusColumn = table === "video_calls" ? "payment_status" : "status";

  // Subscriptions só aceitam 'active' (paid) ou cancelled/refunded.
  // Status intermediários (authorized/in_analysis/partially_refunded) não devem
  // sobrescrever uma assinatura, então pulamos aqui.
  if (
    table === "subscriptions" &&
    (status === "authorized" || status === "in_analysis" || status === "partially_refunded")
  ) {
    return;
  }

  const mapped =
    table === "subscriptions" && status === "paid" ? "active" : status;

  const updatePayload: Record<string, unknown> = {
    [statusColumn]: mapped,
    provider_ref: providerRef,
  };

  // video_calls guarda o pagamento em payment_status; quando confirma,
  // precisamos também virar o status geral para 'accepted' (a partir de
  // 'pending_payment') para que a sala fique disponível para entrar.
  if (table === "video_calls" && status === "paid") {
    updatePayload.status = "accepted";
  }

  let q = supabaseAdmin.from(table).update(updatePayload).eq("id", id);

  // Não sobrescrever assinatura já ativa com um status intermediário tardio
  if (table === "subscriptions" && status !== "paid") {
    q = q.neq("status", "active");
  }

  // Só promover para 'accepted' quando ainda está em pending_payment,
  // evitando reativar chamadas canceladas/expiradas.
  if (table === "video_calls" && status === "paid") {
    q = q.eq("status", "pending_payment");
  }

  await q;
}




async function applyTransferStatus(
  supabaseAdmin: any,
  withdrawalId: string,
  status: WithdrawalStatus,
  providerRef: string,
  failReason?: string | null,
) {
  const update: Record<string, unknown> = {
    status,
    provider_ref: providerRef,
  };
  if (status === "paid") update.processed_at = new Date().toISOString();
  if (status === "failed" && failReason) update.rejection_reason = failReason;

  const { data: prev } = await supabaseAdmin
    .from("withdrawals")
    .select("status, creator_id")
    .eq("id", withdrawalId)
    .maybeSingle();

  let q = supabaseAdmin.from("withdrawals").update(update).eq("id", withdrawalId);

  // Um saque pago nunca volta para falha/recusa por evento tardio.
  if (status === "failed" || status === "rejected") {
    q = q.neq("status", "paid");
  }

  // Não sobrescrever um saque já finalizado com um status intermediário tardio
  const isIntermediate =
    status === "requested" || status === "approved" || status === "in_review";
  if (isIntermediate) {
    q = q.not("status", "in", "(paid,failed,rejected)");
  }
  await q;

  // TRANSFER_DONE sempre vira pago; se o saque estava recusado/falho, alerta o admin.
  if (status === "paid" && prev && (prev.status === "rejected" || prev.status === "failed")) {
    await supabaseAdmin.from("audit_logs").insert({
      action: "withdrawal.paid_after_final_status",
      actor_id: prev.creator_id,
      target_table: "withdrawals",
      target_id: withdrawalId,
      metadata: { previous_status: prev.status, provider_ref: providerRef, alert: true },
    });
  }
}




export const Route = createFileRoute("/api/public/webhooks/asaas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.ASAAS_WEBHOOK_TOKEN;
        const headerToken = request.headers.get("asaas-access-token");
        if (!secret || headerToken !== secret) {
          return new Response("unauthorized", { status: 401 });
        }

        const bodyText = await request.text();
        let payload: AsaasWebhookPayload;
        try {
          payload = JSON.parse(bodyText);
        } catch {
          return new Response("bad json", { status: 400 });
        }

        const transferId = payload.transfer?.id;
        const eventId =
          payload.id ??
          `${payload.event}:${payload.payment?.id ?? transferId ?? "unknown"}`;
        const eventType = payload.event ?? "UNKNOWN";
        const paymentId = payload.payment?.id;
        const externalRef =
          payload.payment?.externalReference ?? payload.transfer?.externalReference ?? null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // idempotency
        const { error: insErr } = await supabaseAdmin.from("asaas_events").insert({
          event_id: eventId,
          event_type: eventType,
          payload: payload as any,
        });
        if (insErr && !String(insErr.message).toLowerCase().includes("duplicate")) {
          console.error("[asaas webhook] insert event failed", insErr);
        }
        if (insErr && String(insErr.message).toLowerCase().includes("duplicate")) {
          // Só ignora se o evento já foi processado; senão reprocessa (falha anterior).
          const { data: prev } = await supabaseAdmin
            .from("asaas_events")
            .select("processed_at")
            .eq("event_id", eventId)
            .maybeSingle();
          if (prev?.processed_at) return new Response("ok", { status: 200 });
        }

        // ---- Fluxo de Transferências (saques) ----
        if (transferId && TRANSFER_STATUS_MAP[eventType]) {
          const targetWithdrawalStatus = TRANSFER_STATUS_MAP[eventType];
          try {
            // localizar saque: primeiro por provider_ref, depois por externalReference (=withdrawal.id)
            let { data: withdrawal } = await supabaseAdmin
              .from("withdrawals")
              .select("id, status")
              .eq("provider_ref", transferId)
              .maybeSingle();

            if (!withdrawal && externalRef) {
              const res = await supabaseAdmin
                .from("withdrawals")
                .select("id, status")
                .eq("id", externalRef)
                .maybeSingle();
              withdrawal = res.data;
            }

            if (withdrawal) {
              await applyTransferStatus(
                supabaseAdmin,
                withdrawal.id,
                targetWithdrawalStatus,
                transferId,
                payload.transfer?.failReason ?? null,
              );
            } else {
              console.warn("[asaas webhook] transfer sem saque correspondente", {
                eventType,
                transferId,
                externalRef,
              });
            }
          } catch (e) {
            console.error("[asaas webhook] transfer processing error", e);
            return new Response("error", { status: 500 });
          }

          await supabaseAdmin
            .from("asaas_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
          return new Response("ok", { status: 200 });
        }

        // ---- Fluxo de Assinaturas recorrentes ----
        // Eventos SUBSCRIPTION_* refletem alterações no próprio recurso do
        // Asaas (cancelamento, inativação). Cobranças recorrentes chegam como
        // PAYMENT_* com `payment.subscription` preenchido — tratamos abaixo.
        const subscriptionId = payload.subscription?.id;
        if (subscriptionId && eventType.startsWith("SUBSCRIPTION_")) {
          try {
            if (
              eventType === "SUBSCRIPTION_DELETED" ||
              eventType === "SUBSCRIPTION_INACTIVATED" ||
              eventType === "SUBSCRIPTION_ENDED"
            ) {
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  auto_renew: false,
                  cancelled_at: new Date().toISOString(),
                })
                .eq("asaas_subscription_id", subscriptionId);
            }
          } catch (e) {
            console.error("[asaas webhook] subscription event error", e);
          }
          await supabaseAdmin
            .from("asaas_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
          return new Response("ok", { status: 200 });
        }



        if (!paymentId) {
          await supabaseAdmin
            .from("asaas_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
          return new Response("ok", { status: 200 });
        }


        // localiza intent (pode não existir ainda em cobranças recorrentes)
        let { data: intent } = await supabaseAdmin
          .from("payment_intents")
          .select("id, processed_at, metadata")
          .eq("asaas_payment_id", paymentId)
          .maybeSingle();

        // Cobrança recorrente do Asaas: `payment.subscription` traz o id da
        // recorrência. Se ainda não temos intent, criamos um novo apontando
        // para a assinatura local — assim `applyPaidIntent` reconcilia igual.
        const paymentSubscriptionId = payload.payment?.subscription ?? null;
        if (!intent && paymentSubscriptionId) {
          const { data: localSub } = await supabaseAdmin
            .from("subscriptions")
            .select("id, subscriber_id, plan, price_cents_paid")
            .eq("asaas_subscription_id", paymentSubscriptionId)
            .maybeSingle();
          if (localSub) {
            const { data: newIntent } = await (supabaseAdmin as any)
              .from("payment_intents")
              .insert({
                provider: "asaas",
                event_id: paymentId,
                event_type: eventType,
                asaas_payment_id: paymentId,
                asaas_invoice_url: payload.payment?.invoiceUrl ?? null,
                method: "CREDIT_CARD",
                metadata: {
                  referenceTable: "subscriptions",
                  referenceId: localSub.id,
                  buyerId: localSub.subscriber_id,
                  amountCents: localSub.price_cents_paid,
                  recurringCycle: true,
                  plan: localSub.plan,
                },
              })
              .select("id, processed_at, metadata")
              .single();
            intent = newIntent;
          }
        }

        const meta = (intent?.metadata ?? {}) as {
          referenceTable?: string;
          referenceId?: string;
          buyerId?: string;
          amountCents?: number;
        };

        let targetStatus: TargetStatus | null = null;
        if (TERMINAL_PAID.has(eventType) || RISK_APPROVED.has(eventType)) {
          targetStatus = "paid";
        } else if (TERMINAL_PARTIAL_REFUND.has(eventType)) {
          targetStatus = "partially_refunded";
        } else if (TERMINAL_REFUNDED.has(eventType)) {
          targetStatus = "refunded";
        } else if (TERMINAL_CANCELLED.has(eventType) || RISK_REPROVED.has(eventType)) {
          targetStatus = "cancelled";
        } else if (TERMINAL_AUTHORIZED.has(eventType)) {
          targetStatus = "authorized";
        } else if (RISK_PENDING.has(eventType)) {
          targetStatus = "in_analysis";
        } else if (SPLIT_EVENTS.has(eventType)) {
          console.warn("[asaas webhook] split event", {
            eventType,
            paymentId,
            externalRef,
          });
        }

        // PAYMENT_OVERDUE numa assinatura recorrente = pagamento falhou.
        // Não cancelamos a assinatura (o Asaas ainda tenta cobrar em ciclos
        // seguintes); apenas marcamos past_due para a UI avisar o usuário.
        if (
          eventType === "PAYMENT_OVERDUE" &&
          meta.referenceTable === "subscriptions" &&
          meta.referenceId
        ) {
          targetStatus = null;
          await (supabaseAdmin as any)
            .from("subscriptions")
            .update({ status: "past_due", provider_ref: paymentId })
            .eq("id", meta.referenceId)
            .neq("status", "cancelled");
        }




        try {
          if (targetStatus === "paid" && intent) {
            // delegated to shared reconcile helper (also used by the poller)
            const { applyPaidIntent } = await import("@/lib/payments-reconcile.server");
            await applyPaidIntent(supabaseAdmin, intent, paymentId, eventType);
          } else if (targetStatus && meta.referenceTable) {
            if (
              meta.referenceTable === "wallet_topups" &&
              (targetStatus === "refunded" || targetStatus === "partially_refunded") &&
              eventType !== "PAYMENT_REFUND_DENIED"
            ) {
              // Estorno/chargeback de recarga: debita o saldo (ou registra dívida e bloqueia).
              const pay: any = payload.payment ?? {};
              const refunds: any[] = Array.isArray(pay.refunds) ? pay.refunds : [];
              const refundedBrl =
                targetStatus === "partially_refunded"
                  ? Number(pay.refundedValue ?? refunds.reduce((a, r) => a + Number(r?.value ?? 0), 0) ?? 0)
                  : 0; // 0 = valor total da recarga
              const { error: revErr } = await (supabaseAdmin as any).rpc("reverse_wallet_topup", {
                _provider_ref: paymentId,
                _amount_cents: Math.round(refundedBrl * 100),
                _event: eventType,
              });
              if (revErr) throw new Error(`reverse_wallet_topup: ${revErr.message}`);
            }
            if (meta.referenceTable !== "wallet_topups" && meta.referenceId) {
              await markStatus(
                supabaseAdmin,
                meta.referenceTable,
                meta.referenceId,
                targetStatus,
                paymentId,
              );
            }
            if (intent) {
              await supabaseAdmin
                .from("payment_intents")
                .update({
                  processed_at: new Date().toISOString(),
                  event_type: eventType,
                })
                .eq("id", intent.id);
            }
          } else if (intent) {
            await supabaseAdmin
              .from("payment_intents")
              .update({
                processed_at: new Date().toISOString(),
                event_type: eventType,
              })
              .eq("id", intent.id);
          }

          await supabaseAdmin
            .from("asaas_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
        } catch (e) {
          console.error("[asaas webhook] processing error", e);
          return new Response("error", { status: 500 });
        }


        return new Response("ok", { status: 200 });
      },
    },
  },
});
