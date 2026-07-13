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
    .select("asaas_customer_id, username")
    .eq("user_id", userId)
    .single();
  if (error || !profile) throw new Error("perfil não encontrado");
  if (profile.asaas_customer_id) return profile.asaas_customer_id as string;

  const { data: userRes } = await supabase.auth.getUser();
  const email = userRes?.user?.email ?? null;
  const asaas = await loadAsaas();
  const customer = await asaas.createCustomer({
    name: profile.username,
    email,
    externalReference: userId,
  });
  await supabase
    .from("profiles")
    .update({ asaas_customer_id: customer.id })
    .eq("user_id", userId);
  return customer.id;
}

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

export const createCreatorSubaccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      name: string;
      email: string;
      cpfCnpj: string;
      birthDate?: string;
      mobilePhone?: string;
      address?: string;
      addressNumber?: string;
      province?: string;
      postalCode?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("asaas_wallet_id, kyc_status")
      .eq("user_id", userId)
      .single();
    if (profile?.asaas_wallet_id) {
      return { walletId: profile.asaas_wallet_id };
    }
    if (profile?.kyc_status !== "verified") {
      throw new Error("KYC precisa estar verificado antes de criar subconta");
    }
    const asaas = await loadAsaas();
    const sub = await asaas.createSubaccount({
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj.replace(/\D/g, ""),
      birthDate: data.birthDate,
      mobilePhone: data.mobilePhone,
      address: data.address,
      addressNumber: data.addressNumber,
      province: data.province,
      postalCode: data.postalCode?.replace(/\D/g, ""),
    });
    const status =
      typeof sub.accountStatus === "string"
        ? sub.accountStatus
        : sub.accountStatus?.general ?? "PENDING";
    await supabase
      .from("profiles")
      .update({
        asaas_account_id: sub.id,
        asaas_wallet_id: sub.walletId,
        asaas_account_status: status,
      })
      .eq("user_id", userId);
    return { walletId: sub.walletId, accountId: sub.id, status };
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

    const { data: unlock, error: uErr } = await supabase
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

    const asaas = await loadAsaas();
    const payment = await asaas.createPayment({
      customerId,
      billingType: data.method,
      amountCents: pub.price_cents,
      description: `Desbloqueio publicação ${pub.id.slice(0, 8)}`,
      externalReference: `publication_unlock:${unlock.id}`,
      creatorWalletId: walletId,
      ...buildCardArgs(data.card),
    });

    await supabase
      .from("publication_unlocks")
      .update({ provider_ref: payment.id })
      .eq("id", unlock.id);

    let pixQr = null;
    if (data.method === "PIX") {
      pixQr = await asaas.getPixQrCode(payment.id);
    }

    const intentId = await recordIntent(supabase, {
      asaasPayment: payment,
      method: data.method,
      referenceTable: "publication_unlocks",
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
