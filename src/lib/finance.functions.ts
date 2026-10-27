import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProfileIdFor } from "@/lib/profile-active.server";

/**
 * Todas as métricas financeiras são derivadas de `transactions` filtrando
 * por `creator_profile_id = perfil ativo`. Assim paid e free vinculado têm
 * saldos/extratos independentes. O agregado em `creator_wallets` continua
 * user-level (uma linha por user); o split de released/pending por persona
 * é reconstituído aqui a partir do histórico de transações do perfil.
 */
async function computeProfileWallet(
  supabase: any,
  userId: string,
  profileId: string,
) {
  const [txRes, wRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("net_cents, is_international, wallet_released_at")
      .eq("creator_profile_id", profileId)
      .eq("status", "paid")
      .gt("net_cents", 0)
      .not("kind", "in", "(withdrawal,refund,wallet_topup,wallet_bonus)"),
    supabase
      .from("withdrawals")
      .select("amount_cents, status")
      .eq("creator_profile_id", profileId)
      .in("status", ["requested", "in_review", "approved", "paid"] as any),
  ]);
  if (txRes.error) throw new Error(txRes.error.message);
  if (wRes.error) throw new Error(wRes.error.message);

  let releasedNational = 0;
  let releasedIntl = 0;
  let pendingNational = 0;
  let pendingIntl = 0;
  for (const t of txRes.data ?? []) {
    const net = t.net_cents ?? 0;
    const isIntl = !!t.is_international;
    const released = !!t.wallet_released_at;
    if (released && isIntl) releasedIntl += net;
    else if (released) releasedNational += net;
    else if (isIntl) pendingIntl += net;
    else pendingNational += net;
  }
  const reservedWithdrawalCents = (wRes.data ?? []).reduce(
    (acc: number, r: any) => acc + (r.amount_cents ?? 0),
    0,
  );
  // Teto: disponível do usuário inteiro (carteira menos saques de todos os perfis),
  // mesma regra da função request_withdrawal no banco.
  const [cwRes, allWRes] = await Promise.all([
    supabase.from("creator_wallets").select("released_cents").eq("user_id", userId).maybeSingle(),
    supabase
      .from("withdrawals")
      .select("amount_cents")
      .eq("creator_id", userId)
      .in("status", ["requested", "in_review", "approved", "paid"] as any),
  ]);
  const userAvailable = Math.max(
    Number(cwRes.data?.released_cents ?? 0) -
      (allWRes.data ?? []).reduce((a: number, r: any) => a + (r.amount_cents ?? 0), 0),
    0,
  );
  const releasedTotal = Math.min(
    Math.max(releasedNational + releasedIntl - reservedWithdrawalCents, 0),
    userAvailable,
  );
  // preserva proporção do split ao aplicar os saques
  const histTotal = releasedNational + releasedIntl;
  let dispIntl = 0;
  let dispNat = releasedTotal;
  if (histTotal > 0 && releasedTotal > 0) {
    dispIntl = Math.round((releasedTotal * releasedIntl) / histTotal);
    dispNat = Math.max(releasedTotal - dispIntl, 0);
  }
  return {
    releasedNational: dispNat,
    releasedInternational: dispIntl,
    pendingNational,
    pendingInternational: pendingIntl,
  };
}

/**
 * Saldo consolidado do criador para o perfil ativo.
 */
export const getCreatorWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    if (!profileId) {
      return {
        releasedCents: 0,
        pendingNationalCents: 0,
        pendingInternationalCents: 0,
        updatedAt: null as string | null,
      };
    }
    const w = await computeProfileWallet(supabase, userId, profileId);
    return {
      releasedCents: w.releasedNational + w.releasedInternational,
      pendingNationalCents: w.pendingNational,
      pendingInternationalCents: w.pendingInternational,
      updatedAt: null as string | null,
    };
  });

/**
 * Visão geral do banco do criador com split nacional × internacional.
 */
export const getCreatorBancoOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    if (!profileId) {
      return {
        national: { releasedCents: 0, pendingCents: 0 },
        international: { releasedCents: 0, pendingCents: 0 },
        totals: { releasedCents: 0, pendingCents: 0 },
        updatedAt: null,
      };
    }
    const w = await computeProfileWallet(supabase, userId, profileId);
    return {
      national: {
        releasedCents: w.releasedNational,
        pendingCents: w.pendingNational,
      },
      international: {
        releasedCents: w.releasedInternational,
        pendingCents: w.pendingInternational,
      },
      totals: {
        releasedCents: w.releasedNational + w.releasedInternational,
        pendingCents: w.pendingNational + w.pendingInternational,
      },
      updatedAt: null,
    };
  });

/**
 * Saldo pré-pago (wallet) do assinante. Continua user-level (compra pessoal).
 */
export const getSubscriberWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("subscriber_wallets")
      .select("balance_cents, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return {
      balanceCents: data?.balance_cents ?? 0,
      updatedAt: data?.updated_at ?? null,
    };
  });

/**
 * Resumo de faturamento do perfil ativo para o dashboard.
 */
export const getCreatorEarningsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    if (!profileId) {
      return {
        revenueTodayCents: 0,
        releasedCents: 0,
        totalCents: 0,
        pendingNationalCents: 0,
        pendingInternationalCents: 0,
      };
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [w, todayRes] = await Promise.all([
      computeProfileWallet(supabase, userId, profileId),
      supabase
        .from("transactions")
        .select("amount_cents_gross")
        .eq("creator_profile_id", profileId)
        .eq("status", "paid")
        .gte("created_at", startOfToday.toISOString()),
    ]);
    if (todayRes.error) throw new Error(todayRes.error.message);

    const released = w.releasedNational + w.releasedInternational;
    const revenueToday =
      todayRes.data?.reduce(
        (acc: number, r: any) => acc + (r.amount_cents_gross ?? 0),
        0,
      ) ?? 0;

    return {
      revenueTodayCents: revenueToday,
      releasedCents: released,
      totalCents: released + w.pendingNational + w.pendingInternational,
      pendingNationalCents: w.pendingNational,
      pendingInternationalCents: w.pendingInternational,
    };
  });

/**
 * Extrato paginado do criador (do perfil ativo).
 */
async function hiddenTransactionIds(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("transaction_hides")
    .select("transaction_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return new Set<string>((data ?? []).map((r: any) => r.transaction_id));
}

async function hiddenWithdrawalIds(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("withdrawal_hides")
    .select("withdrawal_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return new Set<string>((data ?? []).map((r: any) => r.withdrawal_id));
}

export const listCreatorTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { limit?: number; offset?: number; includeHidden?: boolean }) => ({
      limit: Math.min(Math.max(data.limit ?? 50, 1), 200),
      offset: Math.max(data.offset ?? 0, 0),
      includeHidden: !!data.includeHidden,
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    if (!profileId) return [];
    const hidden = await hiddenTransactionIds(supabase, userId);
    const { data: rows, error } = await supabase
      .from("transactions")
      .select(
        "id, kind, status, amount_cents_gross, platform_fee_cents, net_cents, payment_method, is_international, buyer_id, created_at, released_at",
      )
      .eq("creator_profile_id", profileId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (error) throw new Error(error.message);
    const list = (rows ?? []).map((r: any) => ({
      ...r,
      hidden: hidden.has(r.id),
    }));
    return data.includeHidden ? list : list.filter((r: any) => !r.hidden);
  });

/**
 * Lista de saques do criador (do perfil ativo).
 */
export const listCreatorWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { includeHidden?: boolean }) => ({
    includeHidden: !!data?.includeHidden,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    if (!profileId) return [];
    const hidden = await hiddenWithdrawalIds(supabase, userId);
    const { data: rows, error } = await supabase
      .from("withdrawals")
      .select(
        "id, amount_cents, fee_cents, net_cents, status, pix_key, is_first_withdrawal, requested_at, processed_at, rejection_reason",
      )
      .eq("creator_profile_id", profileId)
      .order("requested_at", { ascending: false });

    if (error) throw new Error(error.message);
    const list = (rows ?? []).map((r: any) => ({
      ...r,
      hidden: hidden.has(r.id),
    }));
    return data.includeHidden ? list : list.filter((r: any) => !r.hidden);
  });

/**
 * Ocultar / restaurar itens do extrato e de saques (só para o próprio usuário).
 */
const idsValidator = (data: { ids: string[] }) => ({
  ids: (data?.ids ?? []).filter(Boolean).slice(0, 500),
});

export const hideTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idsValidator)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.ids.length === 0) return { ok: true, count: 0 };
    const { error } = await supabase.from("transaction_hides").upsert(
      data.ids.map((id) => ({ user_id: userId, transaction_id: id })),
      { onConflict: "user_id,transaction_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const unhideTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idsValidator)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.ids.length === 0) return { ok: true, count: 0 };
    const { error } = await supabase
      .from("transaction_hides")
      .delete()
      .eq("user_id", userId)
      .in("transaction_id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const hideWithdrawals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idsValidator)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.ids.length === 0) return { ok: true, count: 0 };
    const { error } = await supabase.from("withdrawal_hides").upsert(
      data.ids.map((id) => ({ user_id: userId, withdrawal_id: id })),
      { onConflict: "user_id,withdrawal_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const unhideWithdrawals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idsValidator)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.ids.length === 0) return { ok: true, count: 0 };
    const { error } = await supabase
      .from("withdrawal_hides")
      .delete()
      .eq("user_id", userId)
      .in("withdrawal_id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

/**
 * Últimas transações do assinante (comprador). User-level por design.
 */
export const listSubscriberTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (
      data:
        | {
            limit?: number;
            kinds?: string[];
            paymentMethods?: string[];
            statuses?: string[];
            from?: string;
            to?: string;
            includeHidden?: boolean;
          }
        | undefined,
    ) => ({
      limit: Math.min(Math.max(data?.limit ?? 50, 1), 200),
      kinds: data?.kinds?.filter(Boolean) ?? [],
      paymentMethods: data?.paymentMethods?.filter(Boolean) ?? [],
      statuses: data?.statuses?.filter(Boolean) ?? [],
      from: data?.from ?? null,
      to: data?.to ?? null,
      includeHidden: !!data?.includeHidden,
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("transactions")
      .select("id, kind, status, amount_cents_gross, payment_method, provider, created_at")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.kinds.length > 0) q = q.in("kind", data.kinds as any);
    if (data.paymentMethods.length > 0)
      q = q.in("payment_method", data.paymentMethods as any);
    if (data.statuses.length > 0) q = q.in("status", data.statuses as any);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);

    const [{ data: rows, error }, hidden] = await Promise.all([
      q,
      hiddenTransactionIds(supabase, userId),
    ]);
    if (error) throw new Error(error.message);
    const list = (rows ?? []).map((r: any) => ({
      ...r,
      hidden: hidden.has(r.id),
    }));
    return data.includeHidden ? list : list.filter((r: any) => !r.hidden);
  });
