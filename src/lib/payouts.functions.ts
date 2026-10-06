import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Withdrawals ----

const WITHDRAWAL_MIN_CENTS = 5000; // R$50,00

async function loadAsaas() {
  return await import("@/lib/asaas.server");
}

function centsToBrl(cents: number): number {
  return Math.round(cents) / 100;
}

function mapPixKeyType(
  type?: string,
): "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP" {
  switch (type) {
    case "cpf":
      return "CPF";
    case "cnpj":
      return "CNPJ";
    case "email":
      return "EMAIL";
    case "telefone":
      return "PHONE";
    case "aleatoria":
    default:
      return "EVP";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollTransferStatus(
  asaas: any,
  apiKey: string,
  transferId: string,
  maxAttempts = 10,
  delayMs = 2000,
) {
  for (let i = 0; i < maxAttempts; i++) {
    const transfer = await asaas.getTransfer(apiKey, transferId);
    if (transfer.status === "DONE" || transfer.status === "CANCELLED") {
      return transfer;
    }
    if (i < maxAttempts - 1) await sleep(delayMs);
  }
  return null;
}

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

    const { getActiveProfileIdFor } = await import("@/lib/profile-active.server");
    const activeProfileId = await getActiveProfileIdFor(supabase, userId);

    const [walletRes, activeWithdrawalsRes] = await Promise.all([
      supabase
        .from("creator_wallets")
        .select("released_cents")
        .eq("user_id", userId)
        .single(),
      (activeProfileId
        ? supabase
            .from("withdrawals")
            .select("amount_cents")
            .eq("creator_profile_id", activeProfileId)
            .in("status", ["requested", "paid"] as any)
        : supabase
            .from("withdrawals")
            .select("amount_cents")
            .eq("creator_id", userId)
            .in("status", ["requested", "paid"] as any)),
    ]);
    const wallet = walletRes.data;
    const wErr = walletRes.error;
    if (wErr || !wallet) throw new Error("carteira não encontrada");
    if (activeWithdrawalsRes.error)
      throw new Error(activeWithdrawalsRes.error.message);

    const activeWithdrawalCents =
      activeWithdrawalsRes.data?.reduce(
        (acc, row) => acc + (row.amount_cents ?? 0),
        0,
      ) ?? 0;
    const availableReleasedCents = Math.max(
      wallet.released_cents - activeWithdrawalCents,
      0,
    );
    if (availableReleasedCents < amount)
      throw new Error("saldo liberado insuficiente");

    const { data: pa } = await (supabase as any)
      .from("payout_accounts")
      .select("payout_mode")
      .eq("user_id", userId)
      .maybeSingle();
    const isPixMode = pa?.payout_mode === "pix";

    const { data: profile, error: pErr } = await (supabase as any)
      .from("profiles")
      .select("asaas_api_key_encrypted, cpf")
      .eq("user_id", userId)
      .single();
    if (isPixMode && !profile?.cpf) {
      throw new Error("CPF não encontrado no seu cadastro. Conclua a verificação de identidade.");
    }
    if (!isPixMode && (pErr || !profile?.asaas_api_key_encrypted)) {
      throw new Error(
        "Você precisa cadastrar sua API key Asaas em Meu Banco para sacar automaticamente. Sem ela, faça o saque direto no painel Asaas.",
      );
    }

    const { data: row, error } = await supabase
      .from("withdrawals")
      .insert({
        creator_id: userId,
        creator_profile_id: activeProfileId,
        amount_cents: amount,
        fee_cents: 0,
        net_cents: amount,
        pix_key: data.pixKey.trim(),
        pix_key_type: data.pixKeyType ?? null,
        status: "requested",
        is_first_withdrawal: false,
        provider: "asaas",
      })
      .select("id, amount_cents, fee_cents, net_cents, status, is_first_withdrawal, requested_at")
      .single();
    if (error) throw new Error(error.message);

    try {
      const asaas = await loadAsaas();
      const apiKey = isPixMode
        ? asaas.getPlatformApiKey()
        : asaas.decryptApiKey(profile.asaas_api_key_encrypted as string);
      const transfer = await asaas.createPixTransfer(apiKey, {
        value: centsToBrl(amount),
        pixAddressKey: data.pixKey.trim(),
        pixAddressKeyType: mapPixKeyType(data.pixKeyType),
        externalReference: row.id,
        description: "Saque Monetisexy",
      });

      // Modo Só PIX: a chave precisa ser do mesmo CPF da verificação.
      if (isPixMode) {
        const match = asaas.docMatches(transfer.bankAccount?.cpfCnpj, String(profile.cpf));
        if (match === false) {
          try {
            await asaas.cancelTransfer(apiKey, transfer.id);
          } catch {
            /* se já não puder cancelar, o admin vê como falha */
          }
          throw new Error(
            "A chave PIX informada não está no seu CPF. Cadastre uma chave PIX no seu nome em Meu Banco.",
          );
        }
      }

      let finalStatus = transfer.status;
      if (transfer.status === "PENDING") {
        const polled = await pollTransferStatus(asaas, apiKey, transfer.id);
        if (polled) finalStatus = polled.status;
      }

      const statusMap: Record<string, string> = {
        DONE: "paid",
        CANCELLED: "rejected",
        PENDING: "requested",
      };
      const withdrawalStatus = (statusMap[finalStatus] ?? "requested") as any;

      const update: any = {
        status: withdrawalStatus,
        provider_ref: transfer.id,
      };
      if (withdrawalStatus === "paid") {
        update.processed_at = new Date().toISOString();
      }
      if (withdrawalStatus === "rejected" && transfer.failReason) {
        update.rejection_reason = transfer.failReason;
      }

      await supabase.from("withdrawals").update(update).eq("id", row.id);

      return { ...row, status: withdrawalStatus, provider_ref: transfer.id };
    } catch (err: any) {
      // Em caso de falha na transferência, o saque deixa de contar como débito.
      await supabase
        .from("withdrawals")
        .update({
          status: "failed",
          rejection_reason: String(err?.message ?? "falha na transferência Asaas"),
        })
        .eq("id", row.id);
      throw new Error(err?.message ?? "falha ao criar transferência Asaas");
    }
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

    // Status rejeitado remove o saque do cálculo de saldo disponível.
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

    const { getActiveProfileIdFor } = await import("@/lib/profile-active.server");
    const profileId = await getActiveProfileIdFor(supabase, userId);

    const { data: row, error } = await supabase
      .from("promotions")
      .insert({
        creator_id: userId,
        creator_profile_id: profileId,
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
    const { getActiveProfileIdFor } = await import("@/lib/profile-active.server");
    const profileId = await getActiveProfileIdFor(supabase, userId);
    let q = supabase
      .from("promotions")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });
    if (profileId) q = q.eq("creator_profile_id", profileId);
    const { data, error } = await q;
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
