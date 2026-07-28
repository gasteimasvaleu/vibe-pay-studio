import { createFileRoute } from "@tanstack/react-router";

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: {
    id: string;
    status: string;
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

  let q = supabaseAdmin.from("withdrawals").update(update).eq("id", withdrawalId);

  // Não sobrescrever um saque já finalizado com um status intermediário tardio
  const isIntermediate =
    status === "requested" || status === "approved" || status === "in_review";
  if (isIntermediate) {
    q = q.not("status", "in", "(paid,failed,rejected)");
  }
  await q;
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
          return new Response("ok", { status: 200 });
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

        // ---- Fluxo de Assinaturas ----
        // Auto-renovação está DESATIVADA (tokenização Asaas ainda não liberada).
        // O app não cria mais registros em /v3/subscriptions; qualquer evento
        // SUBSCRIPTION_* que chegue aqui é de dado antigo — apenas logamos e
        // marcamos como processado, sem alterar estado.
        const subscriptionId = payload.subscription?.id;
        if (subscriptionId && eventType.startsWith("SUBSCRIPTION_")) {
          console.log("[asaas webhook] subscription event ignored (auto-renew disabled)", {
            eventType,
            subscriptionId,
            externalRef,
          });
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


        // localiza intent
        const { data: intent } = await supabaseAdmin
          .from("payment_intents")
          .select("id, processed_at, metadata")
          .eq("asaas_payment_id", paymentId)
          .maybeSingle();

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

        // Renovações automáticas de assinatura: DESATIVADAS enquanto a chave
        // Asaas não tem tokenização de cartão. Reativar aqui quando o
        // /v3/subscriptions voltar a ser criado em `createSubscriptionPayment`.



        try {
          if (targetStatus === "paid" && intent) {
            // delegated to shared reconcile helper (also used by the poller)
            const { applyPaidIntent } = await import("@/lib/payments-reconcile.server");
            await applyPaidIntent(supabaseAdmin, intent, paymentId, eventType);
          } else if (targetStatus && meta.referenceTable) {
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
