import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireRole(supabase: any, userId: string, role: "admin") {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("acesso negado");
}

async function logAudit(
  supabase: any,
  actorId: string,
  action: string,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_table: "refund_requests",
    target_id: targetId,
    metadata,
  });
}

export type AdminRefundRequest = {
  id: string;
  userId: string;
  referenceType: string;
  referenceId: string;
  transactionId: string | null;
  amountCents: number;
  reason: string;
  status: string;
  adminNotes: string | null;
  asaasPaymentId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  buyer: {
    username: string | null;
    displayName: string | null;
    email: string | null;
  } | null;
  creator: {
    username: string | null;
    displayName: string | null;
  } | null;
};

export const listRefundRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "admin");

    const { data: rows, error } = await supabase
      .from("refund_requests")
      .select(
        "id, user_id, reference_type, reference_id, transaction_id, amount_cents, reason, status, admin_notes, asaas_payment_id, created_at, resolved_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id as string)));
    const { data: profiles } = await supabase
      .from("profiles_public")
      .select("user_id, username, display_name")
      .in("user_id", userIds);

    const profileMap = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id as string, p));

    return (rows ?? []).map((r: any) => ({
      id: r.id as string,
      userId: r.user_id as string,
      referenceType: r.reference_type as string,
      referenceId: r.reference_id as string,
      transactionId: r.transaction_id as string | null,
      amountCents: Number(r.amount_cents),
      reason: r.reason as string,
      status: r.status as string,
      adminNotes: r.admin_notes as string | null,
      asaasPaymentId: r.asaas_payment_id as string | null,
      createdAt: r.created_at as string,
      resolvedAt: r.resolved_at as string | null,
      buyer: profileMap.get(r.user_id as string)
        ? {
            username: profileMap.get(r.user_id as string).username as string | null,
            displayName: profileMap.get(r.user_id as string).display_name as string | null,
            email: null,
          }
        : null,
      creator: null,
    })) as AdminRefundRequest[];
  });

export const approveRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string; adminNotes?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "admin");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { refundPayment } = await import("@/lib/asaas.server");

    const { data: req, error: reqError } = await supabaseAdmin
      .from("refund_requests")
      .select("*")
      .eq("id", data.requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (reqError) throw new Error(reqError.message);
    if (!req) throw new Error("pedido não encontrado ou já resolvido");

    // Nunca confiar em valor/cobrança/transação gravados no pedido:
    // recarrega a compra real e confirma que pertence a quem pediu.
    const tableMap: Record<string, { table: string; owner: string; amount: string }> = {
      publication_unlock: { table: "publication_unlocks", owner: "buyer_id", amount: "amount_cents" },
      chat_message_unlock: { table: "chat_message_unlocks", owner: "buyer_id", amount: "amount_cents" },
      subscription: { table: "subscriptions", owner: "subscriber_id", amount: "price_cents_paid" },
      tip: { table: "tips", owner: "sender_id", amount: "amount_cents" },
    };
    const ref = tableMap[req.reference_type as string];
    if (!ref) throw new Error("tipo de compra inválido");
    const table = ref.table;
    const { data: purchase, error: pErr } = await (supabaseAdmin as any)
      .from(ref.table)
      .select(`id, ${ref.owner}, ${ref.amount}, transaction_id, provider_ref, status`)
      .eq("id", req.reference_id as string)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!purchase) throw new Error("compra referenciada não encontrada");
    if (purchase[ref.owner] !== req.user_id) throw new Error("compra não pertence a quem pediu o reembolso");
    const txId = (purchase.transaction_id as string | null) ?? null;
    const realAmountCents = Number(purchase[ref.amount] ?? 0);
    let asaasPaymentId: string | null = (purchase.provider_ref as string | null) ?? null;
    if (txId) {
      const { data: tx } = await (supabaseAdmin as any)
        .from("transactions")
        .select("provider_ref, buyer_id")
        .eq("id", txId)
        .maybeSingle();
      if (tx && tx.buyer_id !== req.user_id) throw new Error("transação não pertence a quem pediu");
      asaasPaymentId = asaasPaymentId ?? tx?.provider_ref ?? null;
    }
    if (!asaasPaymentId) throw new Error("ID do pagamento Asaas não encontrado");

    let refundResult: any;
    try {
      refundResult = await refundPayment(asaasPaymentId);
    } catch (e) {
      throw new Error(`falha ao estornar no Asaas: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (table) {
      const newStatus = table === "subscriptions" ? "cancelled" : "refunded";
      const { error: updateError } = await (supabaseAdmin as any)
        .from(table)
        .update({ status: newStatus })
        .eq("id", req.reference_id as string);
      if (updateError) throw new Error(updateError.message);
    }

    if (txId) {
      const { error: txError } = await supabaseAdmin
        .from("transactions")
        .update({ status: "refunded" })
        .eq("id", txId);
      if (txError) throw new Error(txError.message);
    }

    const { error } = await supabaseAdmin
      .from("refund_requests")
      .update({
        status: "approved",
        admin_notes: data.adminNotes?.slice(0, 2000) ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.requestId);

    if (error) throw new Error(error.message);

    await logAudit(supabaseAdmin, userId, "refund_approved", data.requestId, {
      referenceType: req.reference_type,
      referenceId: req.reference_id,
      amountCents: realAmountCents,
      asaasPaymentId,
      asaasRefundStatus: refundResult.status,
    });

    return { ok: true, asaasStatus: refundResult.status };
  });

export const rejectRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string; adminNotes?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "admin");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error: reqError } = await supabaseAdmin
      .from("refund_requests")
      .select("*")
      .eq("id", data.requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (reqError) throw new Error(reqError.message);
    if (!req) throw new Error("pedido não encontrado ou já resolvido");

    const { error } = await supabaseAdmin
      .from("refund_requests")
      .update({
        status: "rejected",
        admin_notes: data.adminNotes?.slice(0, 2000) ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.requestId);

    if (error) throw new Error(error.message);

    await logAudit(supabaseAdmin, userId, "refund_rejected", data.requestId, {
      referenceType: req.reference_type,
      referenceId: req.reference_id,
      amountCents: req.amount_cents,
    });

    return { ok: true };
  });
