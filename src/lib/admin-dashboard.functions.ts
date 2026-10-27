import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("acesso negado");
}

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

const VALID_WITHDRAWAL_STATUSES = new Set([
  "requested",
  "in_review",
  "approved",
  "paid",
  "rejected",
  "failed",
]);

function normalizeWithdrawalStatuses(status?: string) {
  if (!status) return [];

  return status
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s === "pending" ? "in_review" : s))
    .filter((s) => VALID_WITHDRAWAL_STATUSES.has(s));
}

// ---------- Roles / gate ----------

/**
 * Retorna as roles do usuário logado. Público (autenticado) — usado pela
 * navbar para decidir se mostra o ícone do admin.
 */
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r: any) => r.role);
    return {
      isAdmin: roles.includes("admin"),
      isModerator: roles.includes("moderator"),
      roles,
    };
  });

/**
 * Gate usada no beforeLoad do layout /admin. Lança se não for admin.
 */
export const requireAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return { ok: true };
  });

// ---------- Overview / financeiro ----------

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fromIso?: string; toIso?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const to = data.toIso ? new Date(data.toIso) : new Date();
    const from = data.fromIso
      ? new Date(data.fromIso)
      : new Date(to.getTime() - 30 * 24 * 3600 * 1000);

    const [summaryRes, walletsRes, dailyRes, pendingRes, reportsRes, usersRes] =
      await Promise.all([
        supabase.rpc("admin_financial_summary", {
          _from: from.toISOString(),
          _to: to.toISOString(),
        }),
        supabase.rpc("admin_wallets_snapshot"),
        supabase.rpc("admin_daily_revenue", {
          _from: from.toISOString(),
          _to: to.toISOString(),
        }),
        supabase
          .from("withdrawals")
          .select("id", { count: "exact", head: true })
          .in("status", ["requested", "in_review"] as any),
        supabase
          .from("content_reports")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "reviewing"]),
        supabase
          .from("profiles_public" as any)
          .select("user_id", { count: "exact", head: true }),
      ]);

    if (summaryRes.error) throw new Error(summaryRes.error.message);
    if (walletsRes.error) throw new Error(walletsRes.error.message);
    if (dailyRes.error) throw new Error(dailyRes.error.message);

    const s = (summaryRes.data as any[])?.[0] ?? {};
    const w = (walletsRes.data as any[])?.[0] ?? {};

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      summary: {
        grossCents: Number(s.gross_cents ?? 0),
        platformFeeCents: Number(s.platform_fee_cents ?? 0),
        gatewayFeeCents: Number(s.gateway_fee_cents ?? 0),
        netCents: Number(s.net_cents ?? 0),
        txCount: Number(s.tx_count ?? 0),
        payingUsers: Number(s.paying_users ?? 0),
        earningCreators: Number(s.earning_creators ?? 0),
      },
      wallets: {
        creatorReleasedCents: Number(w.creator_released_cents ?? 0),
        creatorPendingNationalCents: Number(w.creator_pending_national_cents ?? 0),
        creatorPendingInternationalCents: Number(
          w.creator_pending_international_cents ?? 0,
        ),
        subscriberBalanceCents: Number(w.subscriber_balance_cents ?? 0),
        withdrawalsPendingCents: Number(w.withdrawals_pending_cents ?? 0),
      },
      daily: ((dailyRes.data as any[]) ?? []).map((r) => ({
        day: r.day as string,
        grossCents: Number(r.gross_cents ?? 0),
        platformFeeCents: Number(r.platform_fee_cents ?? 0),
        txCount: Number(r.tx_count ?? 0),
      })),
      pendingWithdrawals: pendingRes.count ?? 0,
      openReports: reportsRes.count ?? 0,
      totalUsers: usersRes.count ?? 0,
    };
  });

// ---------- Transações ----------

export const listAdminTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      kind?: string | null;
      status?: string | null;
      method?: string | null;
      fromIso?: string | null;
      toIso?: string | null;
      limit?: number;
      offset?: number;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    let q = supabase
      .from("transactions")
      .select(
        "id, kind, status, amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, payment_method, provider, buyer_id, creator_id, created_at, reference_table",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset ?? 0, (data.offset ?? 0) + (data.limit ?? 50) - 1);

    if (data.kind) q = q.eq("kind", data.kind as any);
    if (data.status) q = q.eq("status", data.status as any);
    if (data.method) q = q.eq("payment_method", data.method as any);
    if (data.fromIso) q = q.gte("created_at", data.fromIso);
    if (data.toIso) q = q.lt("created_at", data.toIso);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    // Hydrate buyer/creator usernames
    const ids = new Set<string>();
    (rows ?? []).forEach((r: any) => {
      if (r.buyer_id) ids.add(r.buyer_id);
      if (r.creator_id) ids.add(r.creator_id);
    });
    const usersMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
    if (ids.size > 0) {
      const { data: profs } = await supabase
        .from("profiles_public" as any)
        .select("user_id, username, avatar_url")
        .in("user_id", Array.from(ids));
      (profs ?? []).forEach((p: any) => {
        usersMap[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
      });
    }

    return {
      rows: (rows ?? []).map((r: any) => ({
        ...r,
        buyerUsername: r.buyer_id ? usersMap[r.buyer_id]?.username ?? null : null,
        creatorUsername: r.creator_id ? usersMap[r.creator_id]?.username ?? null : null,
      })),
      count: count ?? 0,
    };
  });

// ---------- Usuários ----------

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      q?: string | null;
      role?: "admin" | "moderator" | "creator" | "subscriber" | null;
      kyc?: string | null;
      banned?: boolean | null;
      limit?: number;
      offset?: number;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    let q = supabase
      .from("profiles")
      .select(
        "user_id, username, display_name, account_type, avatar_url, kyc_status, banned_at, ban_reason, created_at, price_monthly",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset ?? 0, (data.offset ?? 0) + (data.limit ?? 50) - 1);

    if (data.q) {
      const term = `%${data.q.replace(/[%_]/g, "")}%`;
      q = q.or(`username.ilike.${term},display_name.ilike.${term}`);
    }
    if (data.kyc) q = q.eq("kyc_status", data.kyc);
    if (data.banned === true) q = q.not("banned_at", "is", null);
    if (data.banned === false) q = q.is("banned_at", null);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: any) => r.user_id);
    const rolesMap: Record<string, string[]> = {};
    if (ids.length > 0) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      (roles ?? []).forEach((r: any) => {
        rolesMap[r.user_id] = [...(rolesMap[r.user_id] ?? []), r.role];
      });
    }

    let filtered = (rows ?? []).map((r: any) => ({
      ...r,
      roles: rolesMap[r.user_id] ?? [],
    }));
    if (data.role) {
      filtered = filtered.filter((r) => r.roles.includes(data.role));
    }

    return { rows: filtered, count: count ?? 0 };
  });

export const banUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.userId === userId) throw new Error("não é possível banir a si mesmo");
    const { error } = await supabase
      .from("profiles")
      .update({
        banned_at: new Date().toISOString(),
        ban_reason: data.reason.slice(0, 500),
      })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "user.banned", "profiles", data.userId, {
      reason: data.reason,
    });
    return { ok: true };
  });

export const unbanUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("profiles")
      .update({ banned_at: null, ban_reason: null })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "user.unbanned", "profiles", data.userId, {});
    return { ok: true };
  });

// ---------- Saques ----------

export const listAdminWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string; limit?: number }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    let q = supabase
      .from("withdrawals")
      .select(
        "id, creator_id, amount_cents, fee_cents, net_cents, status, pix_key, pix_key_type, provider, provider_ref, requested_at, processed_at, rejection_reason, is_first_withdrawal, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);

    const statuses = normalizeWithdrawalStatuses(data.status);
    if (statuses.length > 0) {
      q = q.in("status", statuses as any);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.creator_id)));
    const profs: Record<string, any> = {};
    if (ids.length > 0) {
      const { data: p } = await supabase
        .from("profiles_public" as any)
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", ids);
      (p ?? []).forEach((r: any) => (profs[r.user_id] = r));
    }
    const modes: Record<string, string> = {};
    if (ids.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: pa } = await (supabaseAdmin as any)
        .from("payout_accounts")
        .select("user_id, payout_mode")
        .in("user_id", ids);
      (pa ?? []).forEach((r: any) => (modes[r.user_id] = r.payout_mode));
    }
    return (rows ?? []).map((r: any) => ({
      ...r,
      creator: profs[r.creator_id] ?? null,
      payout_mode: modes[r.creator_id] ?? "asaas_split",
    }));
  });

/** Resumo do modo "Só PIX": quanto a plataforma guarda/deve aos creators. */
export const getAdminPixPayoutSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: pa, error } = await admin
      .from("payout_accounts")
      .select("user_id")
      .eq("payout_mode", "pix");
    if (error) throw new Error(error.message);
    const ids: string[] = (pa ?? []).map((r: any) => r.user_id);
    if (ids.length === 0)
      return { creators: 0, releasedOwedCents: 0, pendingOwedCents: 0, pendingWithdrawalsCents: 0, pendingWithdrawalsCount: 0 };
    const [{ data: wallets }, { data: wds }] = await Promise.all([
      admin
        .from("creator_wallets")
        .select("user_id, released_cents, pending_national_cents, pending_international_cents")
        .in("user_id", ids),
      admin
        .from("withdrawals")
        .select("creator_id, amount_cents, status")
        .in("creator_id", ids)
        .in("status", ["requested", "approved", "in_review", "paid"]),
    ]);
    let released = 0;
    let pending = 0;
    (wallets ?? []).forEach((w: any) => {
      released += Number(w.released_cents ?? 0);
      pending += Number(w.pending_national_cents ?? 0) + Number(w.pending_international_cents ?? 0);
    });
    let withdrawn = 0;
    let pendingW = 0;
    let pendingCount = 0;
    (wds ?? []).forEach((w: any) => {
      withdrawn += Number(w.amount_cents ?? 0);
      if (w.status !== "paid") {
        pendingW += Number(w.amount_cents ?? 0);
        pendingCount += 1;
      }
    });
    return {
      creators: ids.length,
      releasedOwedCents: Math.max(released - withdrawn, 0) + pendingW,
      pendingOwedCents: pending,
      pendingWithdrawalsCents: pendingW,
      pendingWithdrawalsCount: pendingCount,
    };
  });

// ---------- Reports (fila completa com dados hidratados) ----------

export const listAdminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string; limit?: number }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    let q = supabase
      .from("content_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.status) {
      const statuses = data.status.split(",");
      q = q.in("status", statuses as any);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const reporterIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.reporter_id).filter(Boolean)),
    );
    const profs: Record<string, any> = {};
    if (reporterIds.length > 0) {
      const { data: p } = await supabase
        .from("profiles_public" as any)
        .select("user_id, username, avatar_url")
        .in("user_id", reporterIds);
      (p ?? []).forEach((r: any) => (profs[r.user_id] = r));
    }
    return (rows ?? []).map((r: any) => ({
      ...r,
      reporter: profs[r.reporter_id] ?? null,
    }));
  });
