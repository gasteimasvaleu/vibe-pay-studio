import { createServerFn } from "@tanstack/react-start";
import { adminDb } from "@/lib/admin-db";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getCommissionPct } from "@/lib/commission";

type Method = "PIX" | "CREDIT_CARD";

type CheckoutResult = {
  paymentIntentId: string;
  asaasPaymentId: string;
  status: string;
  method: Method;
  invoiceUrl?: string | null;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  /** true quando cobrança 1-click via cartão salvo (Asaas retornou CONFIRMED). */
  paidImmediately?: boolean;
};

/** Se o Asaas confirmar sincronamente cartão salvo, marca paidImmediately. */
const ASAAS_PAID_SYNC = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

type CardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  holder: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone?: string;
  };
  remoteIp?: string;
};

async function loadAsaas() {
  return await import("@/lib/asaas.server");
}

// provider persistido nas tabelas (subs, tips, unlocks...) para o trigger
// derivar o payment_method correto e calcular a taxa do gateway.
function providerForMethod(method: Method): "asaas_pix" | "asaas_card" {
  return method === "PIX" ? "asaas_pix" : "asaas_card";
}

// Asaas billingType para o /payments. Cartão SEMPRE exige um cartão salvo
// (creditCardToken) — não abrimos checkout hospedado. PIX permanece direto.
function asaasBillingTypeForMethod(method: Method): "PIX" | "CREDIT_CARD" {
  return method === "PIX" ? "PIX" : "CREDIT_CARD";
}

async function ensureCustomerId(
  supabase: any,
  userId: string,
): Promise<string> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("asaas_customer_id, username, cpf")
    .eq("user_id", userId)
    .single();
  if (error || !profile) throw new Error("perfil não encontrado");

  const cpf = (profile.cpf ?? "").replace(/\D/g, "");
  if (!cpf) throw new Error("cpf_required");

  const asaas = await loadAsaas();

  if (profile.asaas_customer_id) {
    return profile.asaas_customer_id as string;
  }

  // Nunca vincula a um cliente Asaas existente achado por CPF: sempre cria um novo.
  const { data: userRes } = await supabase.auth.getUser();
  const email = userRes?.user?.email ?? null;
  const customer = await asaas.createCustomer({
    name: profile.username,
    email,
    cpfCnpj: cpf,
    externalReference: userId,
  });
  const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin as any;
  const { data: upd, error: upErr } = await admin
    .from("profiles")
    .update({ asaas_customer_id: customer.id })
    .eq("user_id", userId)
    .is("asaas_customer_id", null)
    .select("asaas_customer_id");
  if (upErr) throw new Error(upErr.message);
  if (!upd?.length) {
    const { data: cur } = await admin.from("profiles").select("asaas_customer_id").eq("user_id", userId).single();
    if (cur?.asaas_customer_id) return cur.asaas_customer_id as string;
    throw new Error("falha ao vincular cliente de pagamento");
  }
  return customer.id;
}

export const saveBuyerCpf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cpf: string }) => {
    const clean = (input?.cpf ?? "").replace(/\D/g, "");
    if (clean.length !== 11) {
      throw new Error("CPF inválido. Informe 11 dígitos.");
    }
    return { cpf: clean };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("asaas_customer_id, username")
      .eq("user_id", userId)
      .single();

    const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const { data: cur } = await (admin as any).from("profiles").select("cpf").eq("user_id", userId).single();
    if (cur?.cpf && cur.cpf.replace(/\D/g, "") !== data.cpf) throw new Error("CPF já cadastrado. Fale com o suporte para alterar.");
    const { error: upErr } = cur?.cpf ? { error: null } : await (admin as any)
      .from("profiles")
      .update({ cpf: data.cpf })
      .eq("user_id", userId)
      .is("cpf", null);
    if (upErr) throw new Error(upErr.message);

    if (profile?.asaas_customer_id) {
      try {
        const asaas = await loadAsaas();
        await asaas.updateCustomer(profile.asaas_customer_id, { cpfCnpj: data.cpf });
      } catch (e) {
        // não bloqueia: próxima cobrança usará o cliente atualizado ou recriado
        console.warn("[saveBuyerCpf] updateCustomer falhou", e);
      }
    }

    return { ok: true };
  });


async function getCreatorWallet(
  supabase: any,
  creatorId: string,
): Promise<string | null> {
  // Modo "Só PIX": sem split — 100% entra na conta da plataforma.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pa } = await (supabaseAdmin as any)
    .from("payout_accounts")
    .select("payout_mode")
    .eq("user_id", creatorId)
    .maybeSingle();
  if (pa?.payout_mode === "pix") return null;
  const { data, error } = await ((await import("@/integrations/supabase/client.server")).supabaseAdmin as any)
    .from("profiles")
    .select("asaas_wallet_id")
    .eq("user_id", creatorId)
    .single();
  if (error || !data?.asaas_wallet_id) {
    throw new Error("criador ainda não configurou o recebimento");
  }
  return data.asaas_wallet_id as string;
}

function buildCardArgs(card: CardInput | undefined) {
  if (!card) return {};
  return {
    creditCard: {
      holderName: card.holderName,
      number: card.number.replace(/\s+/g, ""),
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      ccv: card.ccv,
    },
    creditCardHolderInfo: {
      name: card.holder.name,
      email: card.holder.email,
      cpfCnpj: card.holder.cpfCnpj.replace(/\D/g, ""),
      postalCode: card.holder.postalCode.replace(/\D/g, ""),
      addressNumber: card.holder.addressNumber,
      phone: card.holder.phone,
    },
    remoteIp: card.remoteIp,
  };
}

/**
 * Resolve os argumentos de cartão + billingType para o Asaas.
 * - Se `savedCardId` for informado (e method === CREDIT_CARD), busca o token
 *   salvo do usuário e retorna `{ creditCardToken }` + billingType CREDIT_CARD
 *   para cobrança 1-click.
 * - Cartão sem `savedCardId` não é permitido: o app exige que o usuário
 *   tokenize/salve o cartão primeiro (UX própria, sem checkout externo).
 */
async function resolveCardArgs(
  supabase: any,
  userId: string,
  method: Method,
  opts: { card?: CardInput; savedCardId?: string | null },
): Promise<{
  args: Record<string, unknown>;
  billingType: "PIX" | "CREDIT_CARD";
  useSavedCard: boolean;
}> {
  if (method !== "CREDIT_CARD") {
    return { args: {}, billingType: "PIX", useSavedCard: false };
  }
  if (!opts.savedCardId) {
    throw new Error("card_token_required");
  }
  const { data: card, error } = await supabase
    .from("saved_cards")
    .select("asaas_customer_id, asaas_card_token")
    .eq("id", opts.savedCardId)
    .eq("user_id", userId)
    .single();
  if (error || !card) throw new Error("Cartão salvo não encontrado");
  return {
    args: { creditCardToken: card.asaas_card_token as string },
    billingType: "CREDIT_CARD",
    useSavedCard: true,
  };
}

async function recordIntent(
  supabase: any,
  args: {
    asaasPayment: any;
    method: Method;
    referenceTable: string;
    referenceId: string;
    metadata?: Record<string, unknown>;
    pixQr?: { encodedImage: string; payload: string } | null;
  },
): Promise<string> {
  void supabase;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("payment_intents")
    .insert({
      provider: "asaas",
      event_id: args.asaasPayment.id,
      event_type: "created",
      asaas_payment_id: args.asaasPayment.id,
      asaas_invoice_url: args.asaasPayment.invoiceUrl ?? null,
      method: args.method,
      pix_qr_code: args.pixQr?.encodedImage ?? null,
      pix_copy_paste: args.pixQr?.payload ?? null,
      payload: args.asaasPayment as any,
      metadata: {
        referenceTable: args.referenceTable,
        referenceId: args.referenceId,
        ...(args.metadata ?? {}),
      },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

// ---------------- Ensure customer / subaccount ----------------

export const ensureAsaasCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const id = await ensureCustomerId(context.supabase, context.userId);
    return { customerId: id };
  });


// ---------------- Publication unlock ----------------

export const createUnlockPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { publicationId: string; method: Method; card?: CardInput; savedCardId?: string | null }) => data,
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const { data: pub, error } = await supabase
      .from("publications")
      .select("id, author_id, price_cents, caption")
      .eq("id", data.publicationId)
      .single();
    if (error || !pub) throw new Error("publicação não encontrada");
    if (pub.author_id === userId) throw new Error("não é possível desbloquear sua própria publicação");
    if (!pub.price_cents || pub.price_cents <= 0) throw new Error("publicação sem preço");

    const walletId = await getCreatorWallet(supabase, pub.author_id);
    const customerId = await ensureCustomerId(supabase, userId);

    const asaas = await loadAsaas();
    const { netCreatorCents } = asaas.computeCreatorNetCents(pub.price_cents, data.method, await getCommissionPct(supabase, userId));
    const providerTag = providerForMethod(data.method);

    const { data: existing } = await supabase
      .from("publication_unlocks")
      .select("id, status")
      .eq("publication_id", pub.id)
      .eq("buyer_id", userId)
      .maybeSingle();

    let unlockId: string;
    if (existing) {
      if (existing.status === "paid") {
        throw new Error("publicação já desbloqueada");
      }
      const { error: updErr } = await (await adminDb())
        .from("publication_unlocks")
        .update({
          amount_cents: pub.price_cents,
          provider: providerTag,
          status: "pending",
          provider_ref: null,
        })
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      unlockId = existing.id;
    } else {
      const { data: inserted, error: uErr } = await (await adminDb())
        .from("publication_unlocks")
        .insert({
          publication_id: pub.id,
          buyer_id: userId,
          amount_cents: pub.price_cents,
          provider: providerTag,
          status: "pending",
        })
        .select("id")
        .single();
      if (uErr) throw new Error(uErr.message);
      unlockId = inserted.id;
    }


        const __cardArgs = await resolveCardArgs(supabase, userId, data.method, { card: data.card, savedCardId: data.savedCardId });
    const payment = await asaas.createPayment({
      customerId,
      billingType: __cardArgs.billingType,
      amountCents: pub.price_cents,
      description: `Compra MTX`,
      externalReference: `publication_unlock:${unlockId}`,
      creatorWalletId: walletId,
      netCreatorCents,
      ...__cardArgs.args,
    });

    await (await adminDb())
      .from("publication_unlocks")
      .update({ provider_ref: payment.id })
      .eq("id", unlockId);

    let pixQr = null;
    if (data.method === "PIX") {
      pixQr = await asaas.getPixQrCode(payment.id);
    }

    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "publication_unlocks",
      referenceId: unlockId,
      pixQr,
    });

    return {
      paymentIntentId: intentId,
      asaasPaymentId: payment.id,
      status: payment.status,
      method: data.method,
      invoiceUrl: payment.invoiceUrl ?? null,
      pixQrCode: pixQr?.encodedImage ?? null,
      pixCopyPaste: pixQr?.payload ?? null,
      paidImmediately: __cardArgs.useSavedCard && ASAAS_PAID_SYNC.has(payment.status),
    };
  });

// ---------------- Story unlock (PIX / Cartão) ----------------

export const createStoryUnlockPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { storyId: string; method: Method; card?: CardInput; savedCardId?: string | null }) => data,
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const { data: story, error } = await supabase
      .from("stories")
      .select("id, creator_id, price_cents, expires_at")
      .eq("id", data.storyId)
      .single();
    if (error || !story) throw new Error("story não encontrado");
    if (story.creator_id === userId) throw new Error("não é possível desbloquear seu próprio story");
    if (!story.price_cents || story.price_cents <= 0) throw new Error("story sem preço");
    if (story.expires_at && new Date(story.expires_at).getTime() < Date.now()) {
      throw new Error("story expirado");
    }

    const walletId = await getCreatorWallet(supabase, story.creator_id);
    const customerId = await ensureCustomerId(supabase, userId);

    const asaas = await loadAsaas();
    const { netCreatorCents } = asaas.computeCreatorNetCents(story.price_cents, data.method, await getCommissionPct(supabase, userId));
    const providerTag = providerForMethod(data.method);

    const { data: existing } = await supabase
      .from("story_unlocks")
      .select("id, status")
      .eq("story_id", story.id)
      .eq("buyer_id", userId)
      .maybeSingle();

    let unlockId: string;
    if (existing) {
      if (existing.status === "paid") throw new Error("story já desbloqueado");
      const { error: updErr } = await (await adminDb())
        .from("story_unlocks")
        .update({
          amount_cents: story.price_cents,
          provider: providerTag,
          status: "pending",
          provider_ref: null,
        })
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      unlockId = existing.id;
    } else {
      const { data: inserted, error: uErr } = await (await adminDb())
        .from("story_unlocks")
        .insert({
          story_id: story.id,
          creator_id: story.creator_id,
          buyer_id: userId,
          amount_cents: story.price_cents,
          provider: providerTag,
          status: "pending",
        })
        .select("id")
        .single();

      if (uErr) throw new Error(uErr.message);
      unlockId = inserted.id;
    }

        const __cardArgs = await resolveCardArgs(supabase, userId, data.method, { card: data.card, savedCardId: data.savedCardId });
    const payment = await asaas.createPayment({
      customerId,
      billingType: __cardArgs.billingType,
      amountCents: story.price_cents,
      description: `Compra MTX`,
      externalReference: `story_unlock:${unlockId}`,
      creatorWalletId: walletId,
      netCreatorCents,
      ...__cardArgs.args,
    });

    await (await adminDb())
      .from("story_unlocks")
      .update({ provider_ref: payment.id })
      .eq("id", unlockId);

    let pixQr = null;
    if (data.method === "PIX") {
      pixQr = await asaas.getPixQrCode(payment.id);
    }

    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "story_unlocks",
      referenceId: unlockId,
      pixQr,
    });

    return {
      paymentIntentId: intentId,
      asaasPaymentId: payment.id,
      status: payment.status,
      method: data.method,
      invoiceUrl: payment.invoiceUrl ?? null,
      pixQrCode: pixQr?.encodedImage ?? null,
      pixCopyPaste: pixQr?.payload ?? null,
      paidImmediately: __cardArgs.useSavedCard && ASAAS_PAID_SYNC.has(payment.status),
    };
  });



// ---------------- Challenge contribution (PIX only) ----------------

export const createChallengeContributionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { publicationId: string; tierCents: number }) => {
    if (!data?.publicationId) throw new Error("publicationId obrigatório");
    if (!Number.isInteger(data.tierCents) || data.tierCents < 100) {
      throw new Error("valor de faixa inválido");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;

    const { data: pub, error } = await supabase
      .from("publications")
      .select("id, author_id, visibility, challenge_cents")
      .eq("id", data.publicationId)
      .single();
    if (error || !pub) throw new Error("publicação não encontrada");
    if (pub.visibility !== "challenge") throw new Error("publicação não é um desafio");
    if (pub.author_id === userId) throw new Error("não é possível contribuir na sua própria publicação");

    const { data: tier, error: tierErr } = await supabase
      .from("publication_challenge_tiers")
      .select("amount_cents")
      .eq("publication_id", pub.id)
      .eq("amount_cents", data.tierCents)
      .maybeSingle();
    if (tierErr) throw new Error(tierErr.message);
    if (!tier) throw new Error("faixa de contribuição inválida");

    const walletId = await getCreatorWallet(supabase, pub.author_id);
    const customerId = await ensureCustomerId(supabase, userId);

    const asaas = await loadAsaas();
    const method: Method = "PIX";
    const { netCreatorCents } = asaas.computeCreatorNetCents(data.tierCents, method, await getCommissionPct(supabase, userId));
    const providerTag = providerForMethod(method);

    const { data: existing } = await supabase
      .from("publication_unlocks")
      .select("id, status")
      .eq("publication_id", pub.id)
      .eq("buyer_id", userId)
      .maybeSingle();

    let unlockId: string;
    if (existing) {
      if (existing.status === "paid") {
        throw new Error("você já contribuiu com este desafio");
      }
      const { error: updErr } = await (await adminDb())
        .from("publication_unlocks")
        .update({
          amount_cents: data.tierCents,
          provider: providerTag,
          status: "pending",
          provider_ref: null,
        })
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      unlockId = existing.id;
    } else {
      const { data: inserted, error: uErr } = await (await adminDb())
        .from("publication_unlocks")
        .insert({
          publication_id: pub.id,
          buyer_id: userId,
          amount_cents: data.tierCents,
          provider: providerTag,
          status: "pending",
        })
        .select("id")
        .single();
      if (uErr) throw new Error(uErr.message);
      unlockId = inserted.id;
    }

    const payment = await asaas.createPayment({
      customerId,
      billingType: method,
      amountCents: data.tierCents,
      description: `Compra MTX`,
      externalReference: `publication_unlock:${unlockId}`,
      creatorWalletId: walletId,
      netCreatorCents,
    });

    await (await adminDb())
      .from("publication_unlocks")
      .update({ provider_ref: payment.id })
      .eq("id", unlockId);

    const pixQr = await asaas.getPixQrCode(payment.id);

    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method,
      referenceTable: "publication_unlocks",
      referenceId: unlockId,
      pixQr,
      metadata: { challenge: true, tierCents: data.tierCents },
    });

    return {
      paymentIntentId: intentId,
      asaasPaymentId: payment.id,
      status: payment.status,
      method,
      invoiceUrl: payment.invoiceUrl ?? null,
      pixQrCode: pixQr?.encodedImage ?? null,
      pixCopyPaste: pixQr?.payload ?? null,
    };
  });

// ---------------- Tip ----------------



export const createTipPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      creatorId: string;
      amountCents: number;
      method: Method;
      publicationId?: string;
      message?: string;
      card?: CardInput;
      savedCardId?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    if (data.creatorId === userId) throw new Error("não pode enviar tip para você mesmo");
    if (data.amountCents < 500) throw new Error("valor mínimo é R$ 5,00");

    const walletId = await getCreatorWallet(supabase, data.creatorId);
    const customerId = await ensureCustomerId(supabase, userId);

    const asaas = await loadAsaas();
    const { netCreatorCents } = asaas.computeCreatorNetCents(data.amountCents, data.method, await getCommissionPct(supabase, userId));
    const providerTag = providerForMethod(data.method);

    const { data: tip, error } = await (await adminDb())
      .from("tips")
      .insert({
        creator_id: data.creatorId,
        sender_id: userId,
        publication_id: data.publicationId ?? null,
        amount_cents: data.amountCents,
        message: data.message?.slice(0, 300) ?? null,
        provider: providerTag,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

        const __cardArgs = await resolveCardArgs(supabase, userId, data.method, { card: data.card, savedCardId: data.savedCardId });
    const payment = await asaas.createPayment({
      customerId,
      billingType: __cardArgs.billingType,
      amountCents: data.amountCents,
      description: `Compra MTX`,
      externalReference: `tip:${tip.id}`,
      creatorWalletId: walletId,
      netCreatorCents,
      ...__cardArgs.args,
    });

    await (await adminDb()).from("tips").update({ provider_ref: payment.id }).eq("id", tip.id);

    const pixQr = data.method === "PIX" ? await asaas.getPixQrCode(payment.id) : null;
    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "tips",
      referenceId: tip.id,
      pixQr,
    });
    return {
      paymentIntentId: intentId,
      asaasPaymentId: payment.id,
      status: payment.status,
      method: data.method,
      invoiceUrl: payment.invoiceUrl ?? null,
      pixQrCode: pixQr?.encodedImage ?? null,
      pixCopyPaste: pixQr?.payload ?? null,
      paidImmediately: __cardArgs.useSavedCard && ASAAS_PAID_SYNC.has(payment.status),
    };
  });

// ---------------- Subscription ----------------

const PLAN_MONTHS: Record<"monthly" | "quarterly" | "semiannual", number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
};

export const createSubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      creatorId: string;
      creatorProfileId?: string | null;
      plan: "monthly" | "quarterly" | "semiannual";
      method: Method;
      card?: CardInput;
      savedCardId?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    if (data.creatorId === userId) throw new Error("não pode assinar seu próprio perfil");

    // Preço vem sempre do perfil pago em creator_profiles (fonte de verdade)
    let pricing: {
      price_monthly: number | null;
      discount_quarterly: number | null;
      discount_semiannual: number | null;
    } | null = null;

    if (data.creatorProfileId) {
      const { data: cp } = await supabase
        .from("creator_profiles")
        .select("price_monthly, discount_quarterly, discount_semiannual")
        .eq("id", data.creatorProfileId)
        .eq("user_id", data.creatorId)
        .maybeSingle();
      pricing = cp ?? null;
    }
    if (!pricing?.price_monthly) {
      const { data: cp } = await supabase
        .from("creator_profiles")
        .select("price_monthly, discount_quarterly, discount_semiannual")
        .eq("user_id", data.creatorId)
        .eq("kind", "paid")
        .maybeSingle();
      pricing = cp ?? pricing;
    }

    const { data: creator, error } = await ((await import("@/integrations/supabase/client.server")).supabaseAdmin as any)
      .from("profiles")
      .select("price_monthly, discount_quarterly, discount_semiannual, asaas_wallet_id")
      .eq("user_id", data.creatorId)
      .single();
    if (error) throw new Error("criador sem plano configurado");
    if (!pricing?.price_monthly) {
      pricing = {
        price_monthly: creator.price_monthly as number | null,
        discount_quarterly: creator.discount_quarterly,
        discount_semiannual: creator.discount_semiannual,
      };
    }
    if (!pricing?.price_monthly) throw new Error("criador sem plano configurado");
    if (!creator.asaas_wallet_id) throw new Error("criador ainda não configurou recebimento");

    const months = PLAN_MONTHS[data.plan];
    const grossCents = Number(pricing.price_monthly) * 100 * months;
    const discount =
      data.plan === "quarterly"
        ? pricing.discount_quarterly
        : data.plan === "semiannual"
          ? pricing.discount_semiannual
          : 0;
    let amountCents = Math.round(grossCents * (1 - (discount ?? 0) / 100));

    let promotionId: string | null = null;

    // Apply active promotion only for monthly plan
    if (data.plan === "monthly") {
      const nowIso = new Date().toISOString();
      const { data: promo } = await supabase
        .from("promotions")
        .select("id, promo_price, max_subscriptions, subscriptions_used")
        .eq("creator_id", data.creatorId)
        .eq("status", "active")
        .lte("starts_at", nowIso)
        .gt("ends_at", nowIso)
        .order("promo_price", { ascending: true })
        .limit(1);
      const p = promo?.[0];
      if (p && p.subscriptions_used < p.max_subscriptions) {
        promotionId = p.id;
        amountCents = Math.round(Number(p.promo_price) * 100);
      }
    }

    const customerId = await ensureCustomerId(supabase, userId);

    // Detecta assinatura ativa para lidar com upgrade (soma de tempo restante)
    const nowMs = Date.now();
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, plan, current_period_end, asaas_subscription_id")
      .eq("creator_id", data.creatorId)
      .eq("subscriber_id", userId)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    let remainingMs = 0;
    let supersedesId: string | null = null;
    if (existingSub) {
      const existingMonths = PLAN_MONTHS[existingSub.plan as "monthly" | "quarterly" | "semiannual"] ?? 1;
      if (months <= existingMonths) {
        throw new Error("plan_downgrade_not_allowed");
      }
      remainingMs = Math.max(0, new Date(existingSub.current_period_end as string).getTime() - nowMs);
      supersedesId = existingSub.id as string;
    }

    const periodEnd = new Date(nowMs + months * 30 * 86400_000 + remainingMs).toISOString();

    const asaas = await loadAsaas();
    const { netCreatorCents } = asaas.computeCreatorNetCents(amountCents, data.method, await getCommissionPct(supabase, userId));
    const providerTag = providerForMethod(data.method);

    const { data: sub, error: sErr } = await (await adminDb())
      .from("subscriptions")
      .insert({
        creator_id: data.creatorId,
        subscriber_id: userId,
        plan: data.plan,
        price_cents_paid: amountCents,
        current_period_end: periodEnd,
        provider: providerTag,
        status: "pending",
        promotion_id: promotionId,
        auto_renew: false,
      })
      .select("id")
      .single();
    if (sErr) throw new Error(sErr.message);

        const __cardArgs = await resolveCardArgs(supabase, userId, data.method, { card: data.card, savedCardId: data.savedCardId });
    const payment = await asaas.createPayment({
      customerId,
      billingType: __cardArgs.billingType,
      amountCents,
      description: `Assinatura MTX`,
      externalReference: `subscription:${sub.id}`,
      creatorWalletId: creator.asaas_wallet_id,
      netCreatorCents,
      ...__cardArgs.args,
    });

    // Renovação automática: só habilitamos quando o assinante usou um cartão
    // salvo (temos o `creditCardToken`). PIX / Boleto / cartão sem token seguem
    // com renovação manual + lembrete por e-mail antes do vencimento.
    let asaasSubscriptionId: string | null = null;
    let autoRenew = false;
    if (data.method === "CREDIT_CARD" && __cardArgs.useSavedCard) {
      try {
        const cycle =
          data.plan === "quarterly"
            ? "QUARTERLY"
            : data.plan === "semiannual"
              ? "SEMIANNUALLY"
              : "MONTHLY";
        // nextDueDate = data do próximo ciclo (após o 1º pagamento já feito).
        const nextDueDate = new Date(periodEnd).toISOString().slice(0, 10);
        const recurring = await asaas.createAsaasSubscription({
          customerId,
          billingType: "CREDIT_CARD",
          amountCents,
          cycle,
          nextDueDate,
          description: `Assinatura MTX`,
          externalReference: `subscription:${sub.id}`,
          creatorWalletId: creator.asaas_wallet_id,
          netCreatorCents,
          creditCardToken: (__cardArgs.args as any).creditCardToken as string,
        });
        asaasSubscriptionId = recurring.id;
        autoRenew = true;
      } catch (err) {
        console.warn("[subscription] falha ao criar recorrência Asaas", err);
      }
    }

    await (await adminDb())
      .from("subscriptions")
      .update({
        provider_ref: payment.id,
        last_payment_id: payment.id,
        asaas_subscription_id: asaasSubscriptionId,
        auto_renew: autoRenew,
      } as any)
      .eq("id", sub.id);

    const pixQr = data.method === "PIX" ? await asaas.getPixQrCode(payment.id) : null;
    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "subscriptions",
      referenceId: sub.id,
      pixQr,
      metadata: supersedesId ? { supersedesSubscriptionId: supersedesId } : undefined,
    });

    // Dispara o e-mail com o QR code (1º ciclo) — best-effort, não bloqueia.
    if (data.method === "PIX" && pixQr) {
      try {
        const { notifyPixInvoice } = await import("./email-events.server");
        const dueBr = new Date(payment.dueDate + "T12:00:00Z").toLocaleDateString("pt-BR");
        void notifyPixInvoice({
          subscriberId: userId,
          creatorId: data.creatorId,
          plan: data.plan,
          amountCents,
          dueDate: dueBr,
          invoiceUrl: payment.invoiceUrl ?? `${process.env.APP_BASE_URL ?? "https://monetisexy.com"}/subscriptions`,
          qrImageBase64: pixQr.encodedImage,
          qrPayload: pixQr.payload,
        });
      } catch (e) {
        console.warn("[subscription] pix invoice email dispatch failed", e);
      }
    }

    return {
      paymentIntentId: intentId,
      asaasPaymentId: payment.id,
      status: payment.status,
      method: data.method,
      invoiceUrl: payment.invoiceUrl ?? null,
      pixQrCode: pixQr?.encodedImage ?? null,
      pixCopyPaste: pixQr?.payload ?? null,
      paidImmediately: __cardArgs.useSavedCard && ASAAS_PAID_SYNC.has(payment.status),
    };
  });

// ---------------- Chat message unlock ----------------

export const createChatUnlockPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { messageId: string; method: Method; card?: CardInput; savedCardId?: string | null }) => data)
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const { data: msg, error } = await supabase
      .from("chat_messages")
      .select("id, sender_id, price_cents, thread_id")
      .eq("id", data.messageId)
      .single();
    if (error || !msg) throw new Error("mensagem não encontrada");
    if (!msg.price_cents || msg.price_cents <= 0) throw new Error("mensagem sem preço");
    if (msg.sender_id === userId) throw new Error("não pode desbloquear sua própria mensagem");

    const walletId = await getCreatorWallet(supabase, msg.sender_id);
    const customerId = await ensureCustomerId(supabase, userId);

    const asaas = await loadAsaas();
    const { netCreatorCents } = asaas.computeCreatorNetCents(msg.price_cents, data.method, await getCommissionPct(supabase, userId));
    const providerTag = providerForMethod(data.method);

    const { data: unlock, error: uErr } = await (await adminDb())
      .from("chat_message_unlocks")
      .insert({
        message_id: msg.id,
        buyer_id: userId,
        creator_id: msg.sender_id,
        amount_cents: msg.price_cents,
        provider: providerTag,
        status: "pending",
      })
      .select("id")
      .single();
    if (uErr) throw new Error(uErr.message);

        const __cardArgs = await resolveCardArgs(supabase, userId, data.method, { card: data.card, savedCardId: data.savedCardId });
    const payment = await asaas.createPayment({
      customerId,
      billingType: __cardArgs.billingType,
      amountCents: msg.price_cents,
      description: `Compra MTX`,
      externalReference: `chat_unlock:${unlock.id}`,
      creatorWalletId: walletId,
      netCreatorCents,
      ...__cardArgs.args,
    });
    await (await adminDb())
      .from("chat_message_unlocks")
      .update({ provider_ref: payment.id })
      .eq("id", unlock.id);

    const pixQr = data.method === "PIX" ? await asaas.getPixQrCode(payment.id) : null;
    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "chat_message_unlocks",
      referenceId: unlock.id,
      pixQr,
    });
    return {
      paymentIntentId: intentId,
      asaasPaymentId: payment.id,
      status: payment.status,
      method: data.method,
      invoiceUrl: payment.invoiceUrl ?? null,
      pixQrCode: pixQr?.encodedImage ?? null,
      pixCopyPaste: pixQr?.payload ?? null,
      paidImmediately: __cardArgs.useSavedCard && ASAAS_PAID_SYNC.has(payment.status),
    };
  });

// ---------------- Video call ----------------

export const createVideoCallPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string; method: Method; card?: CardInput; savedCardId?: string | null }) => data)
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const { data: call, error } = await supabase
      .from("video_calls")
      .select("id, creator_id, requester_id, price_cents, duration_minutes")
      .eq("id", data.callId)
      .single();
    if (error || !call) throw new Error("chamada não encontrada");
    if (call.requester_id !== userId) throw new Error("apenas o solicitante pode pagar");
    if (call.price_cents <= 0) throw new Error("chamada sem preço");

    const walletId = await getCreatorWallet(supabase, call.creator_id);
    const customerId = await ensureCustomerId(supabase, userId);

    const asaas = await loadAsaas();
    const { netCreatorCents } = asaas.computeCreatorNetCents(call.price_cents, data.method, await getCommissionPct(supabase, userId));
    const providerTag = providerForMethod(data.method);

        const __cardArgs = await resolveCardArgs(supabase, userId, data.method, { card: data.card, savedCardId: data.savedCardId });
    const payment = await asaas.createPayment({
      customerId,
      billingType: __cardArgs.billingType,
      amountCents: call.price_cents,
      description: `Compra MTX`,
      externalReference: `video_call:${call.id}`,
      creatorWalletId: walletId,
      netCreatorCents,
      ...__cardArgs.args,
    });
    await (await adminDb())
      .from("video_calls")
      .update({ provider: providerTag, provider_ref: payment.id })
      .eq("id", call.id);

    const pixQr = data.method === "PIX" ? await asaas.getPixQrCode(payment.id) : null;
    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "video_calls",
      referenceId: call.id,
      pixQr,
    });
    return {
      paymentIntentId: intentId,
      asaasPaymentId: payment.id,
      status: payment.status,
      method: data.method,
      invoiceUrl: payment.invoiceUrl ?? null,
      pixQrCode: pixQr?.encodedImage ?? null,
      pixCopyPaste: pixQr?.payload ?? null,
      paidImmediately: __cardArgs.useSavedCard && ASAAS_PAID_SYNC.has(payment.status),
    };
  });

// ---------------- Paid DM upload request ----------------

export const createPaidDmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string; method: Method; card?: CardInput; savedCardId?: string | null }) => data)
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const { data: req, error } = await supabase
      .from("chat_media_requests")
      .select("id, requester_id, creator_id, price_cents")
      .eq("id", data.requestId)
      .single();
    if (error || !req) throw new Error("solicitação não encontrada");
    if (req.requester_id !== userId) throw new Error("apenas o solicitante pode pagar");
    if (req.price_cents <= 0) throw new Error("solicitação sem preço");

    const walletId = await getCreatorWallet(supabase, req.creator_id);
    const customerId = await ensureCustomerId(supabase, userId);

    const asaas = await loadAsaas();
    const { netCreatorCents } = asaas.computeCreatorNetCents(req.price_cents, data.method, await getCommissionPct(supabase, userId));
    const providerTag = providerForMethod(data.method);

        const __cardArgs = await resolveCardArgs(supabase, userId, data.method, { card: data.card, savedCardId: data.savedCardId });
    const payment = await asaas.createPayment({
      customerId,
      billingType: __cardArgs.billingType,
      amountCents: req.price_cents,
      description: `Compra MTX`,
      externalReference: `chat_media_request:${req.id}`,
      creatorWalletId: walletId,
      netCreatorCents,
      ...__cardArgs.args,
    });
    await (await adminDb())
      .from("chat_media_requests")
      .update({ provider: providerTag, provider_ref: payment.id })
      .eq("id", req.id);

    const pixQr = data.method === "PIX" ? await asaas.getPixQrCode(payment.id) : null;
    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "chat_media_requests",
      referenceId: req.id,
      pixQr,
    });
    return {
      paymentIntentId: intentId,
      asaasPaymentId: payment.id,
      status: payment.status,
      method: data.method,
      invoiceUrl: payment.invoiceUrl ?? null,
      pixQrCode: pixQr?.encodedImage ?? null,
      pixCopyPaste: pixQr?.payload ?? null,
      paidImmediately: __cardArgs.useSavedCard && ASAAS_PAID_SYNC.has(payment.status),
    };
  });

// ---------------- Live ticket ----------------

export const createLiveTicketPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { liveId: string; method: Method; card?: CardInput; savedCardId?: string | null }) => data)
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const { data: live, error } = await supabase
      .from("live_sessions")
      .select("id, creator_id, creator_profile_id, price_cents, status")
      .eq("id", data.liveId)
      .single();
    if (error || !live) throw new Error("live não encontrada");
    if (live.creator_id === userId) throw new Error("você é o dono desta live");
    if (live.status === "ended") throw new Error("live encerrada");
    if (!live.price_cents || live.price_cents <= 0) throw new Error("live sem preço");

    // Idempotência: se já pagou, não recria intent.
    const { data: paidExisting } = await supabase
      .from("live_tickets")
      .select("id")
      .eq("live_id", live.id)
      .eq("buyer_id", userId)
      .eq("status", "paid")
      .maybeSingle();
    if (paidExisting) throw new Error("acesso_ja_liberado");

    // Reutiliza um ticket pending existente, ou cria um novo.
    const { data: pending } = await supabase
      .from("live_tickets")
      .select("id")
      .eq("live_id", live.id)
      .eq("buyer_id", userId)
      .maybeSingle();

    let ticketId: string;
    if (pending?.id) {
      ticketId = pending.id as string;
    } else {
      const { data: inserted, error: insErr } = await (await adminDb())
        .from("live_tickets")
        .insert({
          live_id: live.id,
          buyer_id: userId,
          creator_id: live.creator_id,
          creator_profile_id: live.creator_profile_id ?? null,
          amount_cents: live.price_cents,
          provider: "asaas",
          status: "pending",
        })
        .select("id")
        .single();
      if (insErr || !inserted) throw new Error(insErr?.message ?? "falha ao criar ticket");
      ticketId = inserted.id as string;
    }

    const walletId = await getCreatorWallet(supabase, live.creator_id);
    const customerId = await ensureCustomerId(supabase, userId);

    const asaas = await loadAsaas();
    const { netCreatorCents } = asaas.computeCreatorNetCents(live.price_cents, data.method, await getCommissionPct(supabase, userId));
    const providerTag = providerForMethod(data.method);

        const __cardArgs = await resolveCardArgs(supabase, userId, data.method, { card: data.card, savedCardId: data.savedCardId });
    const payment = await asaas.createPayment({
      customerId,
      billingType: __cardArgs.billingType,
      amountCents: live.price_cents,
      description: `Compra MTX`,
      externalReference: `live_tickets:${ticketId}`,
      creatorWalletId: walletId,
      netCreatorCents,
      ...__cardArgs.args,
    });
    await (await adminDb())
      .from("live_tickets")
      .update({ provider: providerTag, provider_ref: payment.id })
      .eq("id", ticketId);

    const pixQr = data.method === "PIX" ? await asaas.getPixQrCode(payment.id) : null;
    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "live_tickets",
      referenceId: ticketId,
      pixQr,
    });
    return {
      paymentIntentId: intentId,
      asaasPaymentId: payment.id,
      status: payment.status,
      method: data.method,
      invoiceUrl: payment.invoiceUrl ?? null,
      pixQrCode: pixQr?.encodedImage ?? null,
      pixCopyPaste: pixQr?.payload ?? null,
      paidImmediately: __cardArgs.useSavedCard && ASAAS_PAID_SYNC.has(payment.status),
    };
  });

// ---------------- Wallet top-up (no split) ----------------


export const createWalletTopupPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { amountCents: number; method: Method; card?: CardInput; savedCardId?: string | null }) => data)
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    if (data.amountCents < 1000) throw new Error("recarga mínima é R$ 10,00");
    if (data.method !== "PIX") throw new Error("Recarga da carteira só por Pix");
    const customerId = await ensureCustomerId(supabase, userId);

    const asaas = await loadAsaas();
        const __cardArgs = await resolveCardArgs(supabase, userId, data.method, { card: data.card, savedCardId: data.savedCardId });
    const payment = await asaas.createPayment({
      customerId,
      billingType: __cardArgs.billingType,
      amountCents: data.amountCents,
      description: `Recarga MTX`,
      externalReference: `wallet_topup:${userId}`,
      // sem split: 100% vai para a conta principal e é depois creditado como saldo do usuário via webhook
      ...__cardArgs.args,
    });

    const pixQr = data.method === "PIX" ? await asaas.getPixQrCode(payment.id) : null;
    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "wallet_topups",
      referenceId: userId,
      metadata: { amountCents: data.amountCents, buyerId: userId },
      pixQr,
    });
    return {
      paymentIntentId: intentId,
      asaasPaymentId: payment.id,
      status: payment.status,
      method: data.method,
      invoiceUrl: payment.invoiceUrl ?? null,
      pixQrCode: pixQr?.encodedImage ?? null,
      pixCopyPaste: pixQr?.payload ?? null,
      paidImmediately: __cardArgs.useSavedCard && ASAAS_PAID_SYNC.has(payment.status),
    };
  });

// ---------------- Poll status ----------------

export const getPaymentIntentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentIntentId: string }) => data)
  .handler(async ({ data, context }) => {
    void context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: intent, error } = await supabaseAdmin
      .from("payment_intents")
      .select("id, asaas_payment_id, processed_at, metadata")
      .eq("id", data.paymentIntentId)
      .single();
    if (error || !intent) throw new Error("intent não encontrado");
    if (!intent.asaas_payment_id) return { status: "pending" };
    const asaas = await loadAsaas();
    const payment = await asaas.getPayment(intent.asaas_payment_id);

    const PAID = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
    let processedAt = intent.processed_at as string | null;
    if (PAID.has(payment.status) && !intent.processed_at) {
      try {
        const { applyPaidIntent } = await import("@/lib/payments-reconcile.server");
        const reconciled = await applyPaidIntent(supabaseAdmin, intent, intent.asaas_payment_id);
        if (reconciled) processedAt = new Date().toISOString();
      } catch (e) {
        console.error("[poller] reconcile failed", e);
      }
    }

    return {
      status: payment.status,
      processedAt,
    };
  });



// ---------------- Payout setup (modo Asaas split ou Só PIX) ----------------

type PayoutSetupInput = {
  payoutMode: "asaas_split" | "pix";
  walletId?: string;
  apiKey?: string;
  pixKeyType: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
  pixKey: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const saveCreatorPayoutSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PayoutSetupInput) => {
    if (data.payoutMode !== "asaas_split" && data.payoutMode !== "pix")
      throw new Error("Escolha como deseja receber");
    if (!data.pixKeyType) throw new Error("Informe o tipo de chave Pix");
    if (!data.pixKey?.trim()) throw new Error("Informe a chave Pix");
    if (data.payoutMode === "asaas_split") {
      if (!data.walletId?.trim()) throw new Error("Informe o Wallet ID Asaas");
      if (!UUID_REGEX.test(data.walletId.trim()))
        throw new Error(
          "Wallet ID inválido. Ele tem o formato 00000000-0000-0000-0000-000000000000 (não é o e-mail).",
        );
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profErr } = await (supabase as any)
      .from("profiles")
      .select("kyc_status, cpf")
      .eq("user_id", userId)
      .single();
    if (profErr || !profile) throw new Error("perfil não encontrado");
    if (profile.kyc_status !== "verified") {
      throw new Error("Verifique sua identidade antes de configurar o recebimento");
    }

    const pixKey = data.pixKey.trim();
    const onlyDigits = (v: string) => v.replace(/\D/g, "");
    if (data.payoutMode === "pix" && data.pixKeyType === "cpf" && profile.cpf) {
      if (onlyDigits(pixKey) !== onlyDigits(String(profile.cpf)))
        throw new Error("A chave PIX CPF precisa ser o mesmo CPF da sua verificação");
    }

    // Troca de modo só com saldo zerado
    const { data: current } = await (supabase as any)
      .from("payout_accounts")
      .select("payout_mode")
      .eq("user_id", userId)
      .maybeSingle();
    if (current && current.payout_mode !== data.payoutMode) {
      const { data: w } = await supabase
        .from("creator_wallets")
        .select("released_cents, pending_national_cents, pending_international_cents")
        .eq("user_id", userId)
        .maybeSingle();
      const total =
        ((w as any)?.released_cents ?? 0) +
        ((w as any)?.pending_national_cents ?? 0) +
        ((w as any)?.pending_international_cents ?? 0);
      const { data: wds } = await supabase
        .from("withdrawals")
        .select("amount_cents")
        .eq("creator_id", userId)
        .in("status", ["requested", "in_review", "approved", "paid"] as any);
      const withdrawn = (wds ?? []).reduce((a, r) => a + (r.amount_cents ?? 0), 0);
      if (total - withdrawn > 0)
        throw new Error("Para trocar o modo de recebimento, saque todo o seu saldo antes.");
    }

    let hasApiKey = false;
    if (data.payoutMode === "asaas_split") {
      const walletId = data.walletId!.trim();
      const updatePayload: any = {
        asaas_wallet_id: walletId,
        asaas_account_status: "ACTIVE",
        asaas_account_id: null,
      };
      if (data.apiKey?.trim()) {
        const asaas = await loadAsaas();
        const recovered = await asaas.getWalletForApiKey(data.apiKey.trim());
        if (recovered.walletId.toLowerCase() !== walletId.toLowerCase()) {
          throw new Error("A API key informada não pertence ao Wallet ID");
        }
        updatePayload.asaas_api_key_encrypted = asaas.encryptApiKey(data.apiKey.trim());
        hasApiKey = true;
      }
      const { error: updErr } = await ((await import("@/integrations/supabase/client.server")).supabaseAdmin as any)
        .from("profiles")
        .update(updatePayload)
        .eq("user_id", userId);
      if (updErr) throw new Error(updErr.message);
    }

    const { error: payoutErr } = await (supabase as any)
      .from("payout_accounts")
      .upsert(
        {
          user_id: userId,
          payout_mode: data.payoutMode,
          pix_key_type: data.pixKeyType,
          pix_key: pixKey,
        },
        { onConflict: "user_id" },
      );
    if (payoutErr) throw new Error(payoutErr.message);

    return { payoutMode: data.payoutMode, hasApiKey };
  });

export const getCreatorPayoutStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select(
        "kyc_status, asaas_wallet_id, asaas_account_status, asaas_api_key_encrypted",
      )
      .eq("user_id", userId)
      .single();
    const { data: payout } = await (supabase as any)
      .from("payout_accounts")
      .select(
        "payout_mode, bank_name, account_type, agency, account_number, pix_key_type, pix_key",
      )
      .eq("user_id", userId)
      .maybeSingle();
    return {
      kycStatus: profile?.kyc_status ?? "pending",
      walletId: (profile?.asaas_wallet_id as string | null) ?? null,
      accountStatus: (profile?.asaas_account_status as string | null) ?? null,
      hasApiKey: !!(profile?.asaas_api_key_encrypted as string | undefined),
      payoutMode: ((payout?.payout_mode as string | undefined) ?? null) as
        | "asaas_split"
        | "pix"
        | null,
      payoutAccount: payout ?? null,
    };
  });
