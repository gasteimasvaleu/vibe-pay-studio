import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Method = "PIX" | "CREDIT_CARD";

type CheckoutResult = {
  paymentIntentId: string;
  asaasPaymentId: string;
  status: string;
  method: Method;
  invoiceUrl?: string | null;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
};

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

  const { data: userRes } = await supabase.auth.getUser();
  const email = userRes?.user?.email ?? null;
  const customer = await asaas.createCustomer({
    name: profile.username,
    email,
    cpfCnpj: cpf,
    externalReference: userId,
  });
  await supabase
    .from("profiles")
    .update({ asaas_customer_id: customer.id })
    .eq("user_id", userId);
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

    const { error: upErr } = await supabase
      .from("profiles")
      .update({ cpf: data.cpf })
      .eq("user_id", userId);
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
): Promise<string> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
    (data: { publicationId: string; method: Method; card?: CardInput }) => data,
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
      const { error: updErr } = await supabase
        .from("publication_unlocks")
        .update({
          amount_cents: pub.price_cents,
          provider: "asaas",
          status: "pending",
          provider_ref: null,
        })
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      unlockId = existing.id;
    } else {
      const { data: inserted, error: uErr } = await supabase
        .from("publication_unlocks")
        .insert({
          publication_id: pub.id,
          buyer_id: userId,
          amount_cents: pub.price_cents,
          provider: "asaas",
          status: "pending",
        })
        .select("id")
        .single();
      if (uErr) throw new Error(uErr.message);
      unlockId = inserted.id;
    }


    const asaas = await loadAsaas();
    const payment = await asaas.createPayment({
      customerId,
      billingType: data.method,
      amountCents: pub.price_cents,
      description: `Desbloqueio publicação ${pub.id.slice(0, 8)}`,
      externalReference: `publication_unlock:${unlockId}`,
      creatorWalletId: walletId,
      ...buildCardArgs(data.card),
    });

    await supabase
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
    }) => data,
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    if (data.creatorId === userId) throw new Error("não pode enviar tip para você mesmo");
    if (data.amountCents < 500) throw new Error("valor mínimo é R$ 5,00");

    const walletId = await getCreatorWallet(supabase, data.creatorId);
    const customerId = await ensureCustomerId(supabase, userId);

    const { data: tip, error } = await supabase
      .from("tips")
      .insert({
        creator_id: data.creatorId,
        sender_id: userId,
        publication_id: data.publicationId ?? null,
        amount_cents: data.amountCents,
        message: data.message?.slice(0, 300) ?? null,
        provider: "asaas",
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const asaas = await loadAsaas();
    const payment = await asaas.createPayment({
      customerId,
      billingType: data.method,
      amountCents: data.amountCents,
      description: `Tip para criador`,
      externalReference: `tip:${tip.id}`,
      creatorWalletId: walletId,
      ...buildCardArgs(data.card),
    });

    await supabase.from("tips").update({ provider_ref: payment.id }).eq("id", tip.id);

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
      plan: "monthly" | "quarterly" | "semiannual";
      method: Method;
      card?: CardInput;
    }) => data,
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    if (data.creatorId === userId) throw new Error("não pode assinar seu próprio perfil");

    const { data: creator, error } = await supabase
      .from("profiles")
      .select("price_monthly, discount_quarterly, discount_semiannual, asaas_wallet_id")
      .eq("user_id", data.creatorId)
      .single();
    if (error || !creator?.price_monthly) throw new Error("criador sem plano configurado");
    if (!creator.asaas_wallet_id) throw new Error("criador ainda não configurou recebimento");

    const months = PLAN_MONTHS[data.plan];
    const gross = creator.price_monthly * months;
    const discount =
      data.plan === "quarterly"
        ? creator.discount_quarterly
        : data.plan === "semiannual"
          ? creator.discount_semiannual
          : 0;
    const amountCents = Math.round(gross * (1 - (discount ?? 0) / 100));

    const customerId = await ensureCustomerId(supabase, userId);
    const periodEnd = new Date(Date.now() + months * 30 * 86400_000).toISOString();

    const { data: sub, error: sErr } = await supabase
      .from("subscriptions")
      .insert({
        creator_id: data.creatorId,
        subscriber_id: userId,
        plan: data.plan,
        price_cents_paid: amountCents,
        current_period_end: periodEnd,
        provider: "asaas",
        status: "pending",
      })
      .select("id")
      .single();
    if (sErr) throw new Error(sErr.message);

    const asaas = await loadAsaas();
    const payment = await asaas.createPayment({
      customerId,
      billingType: data.method,
      amountCents,
      description: `Assinatura ${data.plan}`,
      externalReference: `subscription:${sub.id}`,
      creatorWalletId: creator.asaas_wallet_id,
      ...buildCardArgs(data.card),
    });

    await supabase.from("subscriptions").update({ provider_ref: payment.id }).eq("id", sub.id);

    const pixQr = data.method === "PIX" ? await asaas.getPixQrCode(payment.id) : null;
    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "subscriptions",
      referenceId: sub.id,
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
    };
  });

// ---------------- Chat message unlock ----------------

export const createChatUnlockPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { messageId: string; method: Method; card?: CardInput }) => data)
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

    const { data: unlock, error: uErr } = await supabase
      .from("chat_message_unlocks")
      .insert({
        message_id: msg.id,
        buyer_id: userId,
        creator_id: msg.sender_id,
        amount_cents: msg.price_cents,
        provider: "asaas",
        status: "pending",
      })
      .select("id")
      .single();
    if (uErr) throw new Error(uErr.message);

    const asaas = await loadAsaas();
    const payment = await asaas.createPayment({
      customerId,
      billingType: data.method,
      amountCents: msg.price_cents,
      description: `Desbloqueio mensagem`,
      externalReference: `chat_unlock:${unlock.id}`,
      creatorWalletId: walletId,
      ...buildCardArgs(data.card),
    });
    await supabase
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
    };
  });

// ---------------- Video call ----------------

export const createVideoCallPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string; method: Method; card?: CardInput }) => data)
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
    const payment = await asaas.createPayment({
      customerId,
      billingType: data.method,
      amountCents: call.price_cents,
      description: `Videochamada ${call.duration_minutes}min`,
      externalReference: `video_call:${call.id}`,
      creatorWalletId: walletId,
      ...buildCardArgs(data.card),
    });
    await supabase
      .from("video_calls")
      .update({ provider: "asaas", provider_ref: payment.id })
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
    };
  });

// ---------------- Wallet top-up (no split) ----------------

export const createWalletTopupPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { amountCents: number; method: Method; card?: CardInput }) => data)
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    if (data.amountCents < 1000) throw new Error("recarga mínima é R$ 10,00");
    const customerId = await ensureCustomerId(supabase, userId);

    const asaas = await loadAsaas();
    const payment = await asaas.createPayment({
      customerId,
      billingType: data.method,
      amountCents: data.amountCents,
      description: `Recarga carteira`,
      externalReference: `wallet_topup:${userId}`,
      // sem split: 100% vai para a conta principal e é depois creditado como saldo do usuário via webhook
      ...buildCardArgs(data.card),
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
    };
  });

// ---------------- Poll status ----------------

export const getPaymentIntentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentIntentId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: intent, error } = await context.supabase
      .from("payment_intents")
      .select("id, asaas_payment_id, processed_at, metadata")
      .eq("id", data.paymentIntentId)
      .single();
    if (error || !intent) throw new Error("intent não encontrado");
    if (!intent.asaas_payment_id) return { status: "pending" };
    const asaas = await loadAsaas();
    const payment = await asaas.getPayment(intent.asaas_payment_id);
    return {
      status: payment.status,
      processedAt: intent.processed_at,
    };
  });

// ---------------- Payout setup (conta Asaas própria + dados bancários) ----------------

type PayoutSetupInput = {
  walletId: string;
  apiKey?: string;
  bankName: string;
  accountType: "corrente" | "poupanca";
  agency: string;
  accountNumber: string;
  pixKeyType: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
  pixKey: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const saveCreatorPayoutSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PayoutSetupInput) => {
    const required: Array<[keyof PayoutSetupInput, string]> = [
      ["walletId", "Wallet ID Asaas"],
      ["bankName", "banco"],
      ["accountType", "tipo de conta"],
      ["agency", "agência"],
      ["accountNumber", "número da conta"],
      ["pixKeyType", "tipo de chave Pix"],
      ["pixKey", "chave Pix"],
    ];
    for (const [k, label] of required) {
      const v = (data as any)[k];
      if (!v || String(v).trim().length === 0) {
        throw new Error(`Informe ${label}`);
      }
    }
    if (!UUID_REGEX.test(data.walletId.trim())) {
      throw new Error("Wallet ID inválido. Deve ser um UUID válido.");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("kyc_status")
      .eq("user_id", userId)
      .single();
    if (profErr || !profile) throw new Error("perfil não encontrado");

    if (profile.kyc_status !== "verified") {
      throw new Error(
        "Verifique sua identidade antes de configurar o recebimento",
      );
    }

    const walletId = data.walletId.trim();
    let encryptedApiKey: string | null = null;

    if (data.apiKey?.trim()) {
      const asaas = await loadAsaas();
      const recovered = await asaas.getWalletForApiKey(data.apiKey.trim());
      if (recovered.walletId.toLowerCase() !== walletId.toLowerCase()) {
        throw new Error("A API key informada não pertence ao Wallet ID");
      }
      encryptedApiKey = asaas.encryptApiKey(data.apiKey.trim());
    }

    const updatePayload: any = {
      asaas_wallet_id: walletId,
      asaas_account_status: "ACTIVE",
      asaas_account_id: null,
    };
    if (encryptedApiKey) {
      updatePayload.asaas_api_key_encrypted = encryptedApiKey;
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", userId);
    if (updErr) throw new Error(updErr.message);

    const { error: payoutErr } = await (supabase as any)
      .from("payout_accounts")
      .upsert(
        {
          user_id: userId,
          bank_name: data.bankName,
          account_type: data.accountType,
          agency: data.agency,
          account_number: data.accountNumber,
          pix_key_type: data.pixKeyType,
          pix_key: data.pixKey,
        },
        { onConflict: "user_id" },
      );
    if (payoutErr) throw new Error(payoutErr.message);

    return {
      walletId,
      accountStatus: "ACTIVE",
      hasApiKey: !!encryptedApiKey,
    };
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
        "bank_name, account_type, agency, account_number, pix_key_type, pix_key",
      )
      .eq("user_id", userId)
      .maybeSingle();
    return {
      kycStatus: profile?.kyc_status ?? "pending",
      walletId: (profile?.asaas_wallet_id as string | null) ?? null,
      accountStatus: (profile?.asaas_account_status as string | null) ?? null,
      hasApiKey: !!(profile?.asaas_api_key_encrypted as string | undefined),
      payoutAccount: payout ?? null,
    };
  });
