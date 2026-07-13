import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Withdrawals ----

const WITHDRAWAL_MIN_CENTS = 5000; // R$50,00
const WITHDRAWAL_FEE_CENTS = 367; // R$3,67 taxa padrão pós-primeiro saque

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { amountCents: number; pixKey: string; pixKeyType?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const amount = Math.floor(data.amountCents);
    if (amount < WITHDRAWAL_MIN_CENTS)
      throw new Error(`valor mínimo de saque: R$ ${(WITHDRAWAL_MIN_CENTS / 100).toFixed(2)}`);
    if (!data.pixKey?.trim()) throw new Error("chave pix obrigatória");

    const { data: wallet, error: wErr } = await supabase
      .from("creator_wallets")
      .select("released_cents")
      .eq("user_id", userId)
      .single();
    if (wErr || !wallet) throw new Error("carteira não encontrada");
    if (wallet.released_cents < amount) throw new Error("saldo liberado insuficiente");

    const { count } = await supabase
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId);
    const isFirst = (count ?? 0) === 0;
    const fee = isFirst ? 0 : WITHDRAWAL_FEE_CENTS;
    const net = amount - fee;

    // Reserva o valor debitando do saldo liberado
    const { error: uErr } = await supabase
      .from("creator_wallets")
      .update({ released_cents: wallet.released_cents - amount })
      .eq("user_id", userId);
    if (uErr) throw new Error(uErr.message);

    const { data: row, error } = await supabase
      .from("withdrawals")
      .insert({
        creator_id: userId,
        amount_cents: amount,
        fee_cents: fee,
        net_cents: net,
        pix_key: data.pixKey.trim(),
        pix_key_type: data.pixKeyType ?? null,
        status: "requested",
        is_first_withdrawal: isFirst,
        provider: "manual",
      })
      .select("id, amount_cents, fee_cents, net_cents, status, is_first_withdrawal, requested_at")
      .single();
    if (error) {
      await supabase
        .from("creator_wallets")
        .update({ released_cents: wallet.released_cents })
        .eq("user_id", userId);
      throw new Error(error.message);
    }
    return row;
  });

export const cancelWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { withdrawalId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: w, error: wErr } = await supabase
      .from("withdrawals")
      .select("id, creator_id, amount_cents, status")
      .eq("id", data.withdrawalId)
      .single();
    if (wErr || !w) throw new Error("saque não encontrado");
    if (w.creator_id !== userId) throw new Error("acesso negado");
    if (w.status !== "requested") throw new Error("saque não pode ser cancelado");

    const { error } = await supabase
      .from("withdrawals")
      .update({ status: "rejected", rejection_reason: "cancelado pelo criador" })
      .eq("id", w.id);
    if (error) throw new Error(error.message);

    // Devolve o valor ao saldo liberado
    const { data: wallet } = await supabase
      .from("creator_wallets")
      .select("released_cents")
      .eq("user_id", userId)
      .single();
    if (wallet) {
      await supabase
        .from("creator_wallets")
        .update({ released_cents: wallet.released_cents + w.amount_cents })
        .eq("user_id", userId);
    }
    return { ok: true };
  });

// ---- Subscriber wallet ----

export const topupSubscriberWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { amountCents: number; provider?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const amount = Math.floor(data.amountCents);
    if (amount <= 0) throw new Error("valor inválido");

    // Cria transação de wallet_topup 'paid' → trigger credita a wallet do assinante
    const { data: tx, error } = await supabase
      .from("transactions")
      .insert({
        kind: "wallet_topup",
        status: "paid",
        buyer_id: userId,
        amount_cents_gross: amount,
        platform_fee_cents: 0,
        net_cents: amount,
        commission_pct_applied: 0,
        payment_method: (data.provider === "pix" ? "pix" : "manual") as any,
        provider: data.provider ?? "manual",
      })
      .select("id, amount_cents_gross, status")
      .single();
    if (error) throw new Error(error.message);
    return tx;
  });

// ---- Promotions ----

export const createPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      name: string;
      description?: string;
      maxSubscriptions: number;
      durationDays: number;
      discountPct: number;
      endsAt: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.discountPct < 1 || data.discountPct > 90)
      throw new Error("desconto deve ficar entre 1% e 90%");
    if (data.maxSubscriptions < 1) throw new Error("quantidade inválida");
    if (data.durationDays < 1) throw new Error("duração inválida");

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("price_monthly")
      .eq("user_id", userId)
      .single();
    if (pErr || !profile?.price_monthly)
      throw new Error("defina o preço mensal antes de criar promoções");

    const monthly = Number(profile.price_monthly);
    const promo = +(monthly * (1 - data.discountPct / 100)).toFixed(2);

    const { data: row, error } = await supabase
      .from("promotions")
      .insert({
        creator_id: userId,
        name: data.name.slice(0, 120),
        description: data.description?.slice(0, 500) ?? "",
        max_subscriptions: data.maxSubscriptions,
        duration_days: data.durationDays,
        discount_pct: data.discountPct,
        monthly_price_snapshot: monthly,
        promo_price: promo,
        ends_at: data.endsAt,
        status: "active",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePromotionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { promotionId: string; status: "active" | "paused" | "ended" }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("promotions")
      .update({ status: data.status })
      .eq("id", data.promotionId)
      .eq("creator_id", userId)
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listCreatorPromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getActivePromotionForCreator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const nowIso = new Date().toISOString();
    const { data: rows, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("creator_id", data.creatorId)
      .eq("status", "active")
      .lte("starts_at", nowIso)
      .gte("ends_at", nowIso)
      .order("promo_price", { ascending: true })
      .limit(1);
    if (error) throw new Error(error.message);
    const promo = rows?.[0];
    if (!promo) return null;
    if (promo.subscriptions_used >= promo.max_subscriptions) return null;
    return promo;
  });
