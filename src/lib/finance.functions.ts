import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Saldo da carteira do criador (liberado + a liberar nacional/internacional).
 */
export const getCreatorWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("creator_wallets")
      .select("released_cents, pending_national_cents, pending_international_cents, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return {
      releasedCents: data?.released_cents ?? 0,
      pendingNationalCents: data?.pending_national_cents ?? 0,
      pendingInternationalCents: data?.pending_international_cents ?? 0,
      updatedAt: data?.updated_at ?? null,
    };
  });

/**
 * Saldo pré-pago (wallet) do assinante.
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
 * Resumo de faturamento do criador para o dashboard:
 * - hoje (bruto pago)
 * - liberado
 * - total (liberado + a liberar)
 */
export const getCreatorEarningsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [walletRes, todayRes] = await Promise.all([
      supabase
        .from("creator_wallets")
        .select("released_cents, pending_national_cents, pending_international_cents")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("amount_cents_gross")
        .eq("creator_id", userId)
        .eq("status", "paid")
        .gte("created_at", startOfToday.toISOString()),
    ]);

    if (walletRes.error) throw new Error(walletRes.error.message);
    if (todayRes.error) throw new Error(todayRes.error.message);

    const released = walletRes.data?.released_cents ?? 0;
    const pendingNational = walletRes.data?.pending_national_cents ?? 0;
    const pendingIntl = walletRes.data?.pending_international_cents ?? 0;
    const revenueToday =
      todayRes.data?.reduce((acc, r) => acc + (r.amount_cents_gross ?? 0), 0) ?? 0;

    return {
      revenueTodayCents: revenueToday,
      releasedCents: released,
      totalCents: released + pendingNational + pendingIntl,
      pendingNationalCents: pendingNational,
      pendingInternationalCents: pendingIntl,
    };
  });

/**
 * Extrato paginado do criador.
 */
export const listCreatorTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { limit?: number; offset?: number }) => ({
    limit: Math.min(Math.max(data.limit ?? 50, 1), 200),
    offset: Math.max(data.offset ?? 0, 0),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("transactions")
      .select(
        "id, kind, status, amount_cents_gross, platform_fee_cents, net_cents, payment_method, is_international, buyer_id, created_at, released_at",
      )
      .eq("creator_id", userId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/**
 * Lista de saques do criador.
 */
export const listCreatorWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("withdrawals")
      .select(
        "id, amount_cents, fee_cents, net_cents, status, pix_key, is_first_withdrawal, requested_at, processed_at, rejection_reason",
      )
      .eq("creator_id", userId)
      .order("requested_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Últimas transações do assinante (comprador).
 */
export const listSubscriberTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { limit?: number } | undefined) => ({
    limit: Math.min(Math.max(data?.limit ?? 10, 1), 50),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("transactions")
      .select("id, kind, status, amount_cents_gross, payment_method, provider, created_at")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) throw new Error(error.message);
    return rows ?? [];
  });
