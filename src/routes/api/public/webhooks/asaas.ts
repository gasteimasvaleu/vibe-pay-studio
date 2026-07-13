import { createFileRoute } from "@tanstack/react-router";

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: {
    id: string;
    status: string;
    externalReference?: string | null;
  };
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

  let q = supabaseAdmin.from(table).update({
    [statusColumn]: mapped,
    provider_ref: providerRef,
  }).eq("id", id);

  // Não sobrescrever assinatura já ativa com um status intermediário tardio
  if (table === "subscriptions" && status !== "paid") {
    q = q.neq("status", "active");
  }
  await q;
}


async function creditWalletTopup(
  supabaseAdmin: any,
  buyerId: string,
  amountCents: number,
  providerRef: string,
) {
  // Cria uma transaction wallet_topup paga; trigger existente credita subscriber_wallets
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

        const eventId = payload.id ?? `${payload.event}:${payload.payment?.id ?? "unknown"}`;
        const eventType = payload.event ?? "UNKNOWN";
        const paymentId = payload.payment?.id;
        const externalRef = payload.payment?.externalReference ?? null;

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
          .select("id, metadata")
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


        try {
          if (targetStatus && meta.referenceTable) {
            if (meta.referenceTable === "wallet_topups") {
              if (targetStatus === "paid" && meta.buyerId && meta.amountCents) {
                await creditWalletTopup(
                  supabaseAdmin,
                  meta.buyerId,
                  meta.amountCents,
                  paymentId,
                );
              }
            } else if (meta.referenceId) {
              await markStatus(
                supabaseAdmin,
                meta.referenceTable,
                meta.referenceId,
                targetStatus,
                paymentId,
              );
            }
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
