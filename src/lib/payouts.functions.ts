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

function normalizePixKey(key: string, type?: string): string {
  const k = key.trim();
  if (type === "cpf" || type === "cnpj") return k.replace(/\D/g, "");
  if (type === "telefone") {
    const d = k.replace(/\D/g, "");
    if (d.length === 10 || d.length === 11) return `+55${d}`;
    if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return `+${d}`;
    return k.startsWith("+") ? k : `+${d}`;
  }
  return k;
}

function friendlyAsaasError(msg: string): string {
  if (/chave informada n[aã]o foi encontrada/i.test(msg))
    return "A chave PIX não foi encontrada. Confira se ela está cadastrada no seu banco e atualize em Meu Banco.";
  return msg;
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
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


    const { data: pa } = await (supabase as any)
      .from("payout_accounts")
      .select("payout_mode")
      .eq("user_id", userId)
      .maybeSingle();
    const isPixMode = pa?.payout_mode === "pix";

    const loadProfile = () =>
      (supabase as any)
        .from("profiles")
        .select("asaas_api_key_encrypted, cpf")
        .eq("user_id", userId)
        .single();
    let { data: profile, error: pErr } = await loadProfile();
    if (isPixMode && !profile?.cpf) {
      // Tenta recuperar o CPF da verificação Veriff já aprovada.
      try {
        const { fillPersonFromVeriff } = await import("@/lib/onboarding.functions");
        await fillPersonFromVeriff((await import("@/integrations/supabase/client.server")).supabaseAdmin, userId);
        ({ data: profile, error: pErr } = await loadProfile());
      } catch (e) {
        console.error("[withdraw] fillPersonFromVeriff failed", e);
      }
      if (!profile?.cpf) throw new Error("cpf_required");
    }
    if (!isPixMode && (pErr || !profile?.asaas_api_key_encrypted)) {
      throw new Error(
        "Você precisa cadastrar sua API key Asaas em Meu Banco para sacar automaticamente. Sem ela, faça o saque direto no painel Asaas.",
      );
    }

    // Saldo travado e validado no banco (todos os perfis, todos os status em andamento).
    const { data: newId, error: rpcErr } = await (supabase as any).rpc("request_withdrawal", {
      _amount_cents: amount,
      _pix_key: data.pixKey.trim(),
      _pix_key_type: data.pixKeyType ?? null,
    });
    if (rpcErr || !newId) {
      const m = rpcErr?.message ?? "";
      throw new Error(/saldo/i.test(m) ? "saldo liberado insuficiente" : m || "falha ao solicitar saque");
    }
    const { data: row, error } = await supabase
      .from("withdrawals")
      .select("id, amount_cents, fee_cents, net_cents, status, is_first_withdrawal, requested_at")
      .eq("id", newId as string)
      .single();
    if (error || !row) throw new Error(error?.message ?? "saque não encontrado");

    let createdTransferId: string | null = null;
    try {
      const asaas = await loadAsaas();
      const apiKey = isPixMode
        ? asaas.getPlatformApiKey()
        : asaas.decryptApiKey(profile.asaas_api_key_encrypted as string);
      const transfer = await asaas.createPixTransfer(apiKey, {
        value: centsToBrl(amount),
        pixAddressKey: normalizePixKey(data.pixKey, data.pixKeyType),
        pixAddressKeyType: mapPixKeyType(data.pixKeyType),
        externalReference: row.id,
        description: "Saque Monetisexy",
      });
      createdTransferId = transfer.id;

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

      const admin = await adminClient();
      await admin
        .from("withdrawals")
        .update(update)
        .eq("id", row.id)
        .eq("creator_id", userId);

      return { ...row, status: withdrawalStatus, provider_ref: transfer.id };
    } catch (err: any) {
      // Em caso de falha na transferência, o saque deixa de contar como débito.
      const msg = friendlyAsaasError(String(err?.message ?? "falha na transferência Asaas"));
      const admin = await adminClient();
      if (createdTransferId) {
        // A transferência já existe no Asaas: não marca como falha.
        // Guarda a referência e deixa o webhook decidir o status final.
        const { error: rErr } = await admin
          .from("withdrawals")
          .update({ provider_ref: createdTransferId })
          .eq("id", row.id)
          .eq("creator_id", userId)
          .eq("status", "requested");
        if (rErr) console.error("[withdraw] save provider_ref error", rErr);
      } else {
        const { error: fErr } = await admin
          .from("withdrawals")
          .update({ status: "failed", rejection_reason: msg })
          .eq("id", row.id)
          .eq("creator_id", userId)
          .eq("status", "requested");
        if (fErr) console.error("[withdraw] mark failed error", fErr);
      }
      throw new Error(msg);
    }
  });

export const cancelWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { withdrawalId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: w, error: wErr } = await supabase
      .from("withdrawals")
      .select("id, creator_id, amount_cents, status, provider_ref")
      .eq("id", data.withdrawalId)
      .single();
    if (wErr || !w) throw new Error("saque não encontrado");
    if (w.creator_id !== userId) throw new Error("acesso negado");
    if (w.status !== "requested") throw new Error("saque não pode ser cancelado");

    const admin = await adminClient();
    if ((w as any).provider_ref) {
      // Transferência já criada: só cancela se o Asaas confirmar.
      const transferId = (w as any).provider_ref as string;
      const { data: pa } = await (supabase as any)
        .from("payout_accounts")
        .select("payout_mode")
        .eq("user_id", userId)
        .maybeSingle();
      const asaas = await loadAsaas();
      let apiKey: string;
      if (pa?.payout_mode === "pix") {
        apiKey = asaas.getPlatformApiKey();
      } else {
        const { data: prof } = await (admin as any)
          .from("profiles")
          .select("asaas_api_key_encrypted")
          .eq("user_id", userId)
          .maybeSingle();
        if (!prof?.asaas_api_key_encrypted) throw new Error("não foi possível cancelar no Asaas");
        apiKey = asaas.decryptApiKey(prof.asaas_api_key_encrypted as string);
      }
      try {
        await asaas.cancelTransfer(apiKey, transferId);
        const t = await asaas.getTransfer(apiKey, transferId);
        if (t.status !== "CANCELLED") throw new Error("not cancelled");
      } catch {
        throw new Error("O Asaas não confirmou o cancelamento. O saque não foi cancelado.");
      }
    }

    const { error } = await admin
      .from("withdrawals")
      .update({ status: "rejected", rejection_reason: "cancelado pelo criador" })
      .eq("id", w.id)
      .eq("creator_id", userId)
      .eq("status", "requested");
    if (error) throw new Error(error.message);

    // Status rejeitado remove o saque do cálculo de saldo disponível.
    return { ok: true };
  });

// ---- Subscriber wallet ----

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
      .from("profiles_public")
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
