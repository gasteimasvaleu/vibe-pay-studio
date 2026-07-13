import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function logAudit(
  supabase: any,
  actorId: string,
  action: string,
  targetTable: string | null,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_table: targetTable,
    target_id: targetId,
    metadata,
  });
}

async function requireRole(
  supabase: any,
  userId: string,
  role: "admin" | "moderator",
) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("acesso negado");
}

// ---- Content reports ----

export const reportContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      targetType: "publication" | "profile" | "chat_message";
      targetId: string;
      reason: string;
      details?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const reason = data.reason.trim();
    if (!reason) throw new Error("motivo obrigatório");
    const { data: row, error } = await supabase
      .from("content_reports")
      .insert({
        reporter_id: userId,
        target_type: data.targetType,
        target_id: data.targetId,
        reason: reason.slice(0, 200),
        details: data.details?.slice(0, 2000) ?? null,
        status: "open",
      })
      .select("id, status, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listOpenReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "moderator").catch(async () => {
      await requireRole(supabase, userId, "admin");
    });
    const { data, error } = await supabase
      .from("content_reports")
      .select("*")
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      reportId: string;
      status: "reviewing" | "actioned" | "dismissed";
      note?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "moderator").catch(async () => {
      await requireRole(supabase, userId, "admin");
    });
    const { data: row, error } = await supabase
      .from("content_reports")
      .update({
        status: data.status,
        resolved_by: data.status === "reviewing" ? null : userId,
        resolved_at: data.status === "reviewing" ? null : new Date().toISOString(),
        resolution_note: data.note ?? null,
      })
      .eq("id", data.reportId)
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, `report.${data.status}`, "content_reports", data.reportId, {
      note: data.note ?? null,
    });
    return row;
  });

// ---- Moderation ----

export const moderatePublication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      publicationId: string;
      status: "approved" | "hidden" | "removed";
      note?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "moderator").catch(async () => {
      await requireRole(supabase, userId, "admin");
    });
    const { data: row, error } = await supabase
      .from("publications")
      .update({ moderation_status: data.status, moderation_note: data.note ?? null })
      .eq("id", data.publicationId)
      .select("id, moderation_status")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, `publication.${data.status}`, "publications", data.publicationId, {
      note: data.note ?? null,
    });
    return row;
  });

// ---- Withdrawals (admin) ----

export const approveWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { withdrawalId: string; providerRef?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "admin");
    const nowIso = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("withdrawals")
      .update({
        status: "paid",
        processed_at: nowIso,
        provider_ref: data.providerRef ?? null,
      })
      .eq("id", data.withdrawalId)
      .select("id, status, creator_id, amount_cents, net_cents")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "withdrawal.approved", "withdrawals", data.withdrawalId, {
      amount_cents: row.amount_cents,
      net_cents: row.net_cents,
    });
    return row;
  });

export const rejectWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { withdrawalId: string; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "admin");
    const { data: w, error: wErr } = await supabase
      .from("withdrawals")
      .select("id, creator_id, amount_cents, status")
      .eq("id", data.withdrawalId)
      .single();
    if (wErr || !w) throw new Error("saque não encontrado");
    if (w.status === "paid") throw new Error("saque já foi pago");

    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: "rejected",
        rejection_reason: data.reason,
        processed_at: new Date().toISOString(),
      })
      .eq("id", w.id);
    if (error) throw new Error(error.message);

    // Devolve o valor ao saldo liberado
    const { data: wallet } = await supabase
      .from("creator_wallets")
      .select("released_cents")
      .eq("user_id", w.creator_id)
      .single();
    if (wallet) {
      await supabase
        .from("creator_wallets")
        .update({ released_cents: wallet.released_cents + w.amount_cents })
        .eq("user_id", w.creator_id);
    }
    await logAudit(supabase, userId, "withdrawal.rejected", "withdrawals", w.id, {
      reason: data.reason,
    });
    return { ok: true };
  });

// ---- Roles ----

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { userId: string; role: "admin" | "moderator" | "creator" | "subscriber" }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "admin");
    const { data: row, error } = await supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role })
      .select("id, user_id, role")
      .single();
    if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
    await logAudit(supabase, userId, "role.granted", "user_roles", data.userId, { role: data.role });
    return row;
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { userId: string; role: "admin" | "moderator" | "creator" | "subscriber" }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "admin");
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "role.revoked", "user_roles", data.userId, { role: data.role });
    return { ok: true };
  });

// ---- KYC ----

export const setKycStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      userId: string;
      status: "pending" | "verified" | "rejected";
      veriffSessionId?: string;
      rejectionReason?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Admin pode setar qualquer perfil; um usuário só pode setar o próprio (para pending após iniciar Veriff)
    if (data.userId !== userId) {
      await requireRole(supabase, userId, "admin");
    } else if (data.status !== "pending") {
      throw new Error("apenas admin pode aprovar/reprovar KYC");
    }

    const update: Record<string, unknown> = {
      kyc_status: data.status,
      veriff_session_id: data.veriffSessionId ?? undefined,
      kyc_rejection_reason: data.status === "rejected" ? data.rejectionReason ?? null : null,
      kyc_verified_at: data.status === "verified" ? new Date().toISOString() : null,
    };

    const { data: row, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("user_id", data.userId)
      .select("user_id, kyc_status, kyc_verified_at")
      .single();
    if (error) throw new Error(error.message);
    if (data.userId !== userId) {
      await logAudit(supabase, userId, `kyc.${data.status}`, "profiles", data.userId, {
        reason: data.rejectionReason ?? null,
      });
    }
    return row;
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { limit?: number }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "admin");
    const { data: rows, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
