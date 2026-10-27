import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

  if (profile.asaas_customer_id) return profile.asaas_customer_id as string;

  const asaas = await loadAsaas();

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

export type SavedCardDTO = {
  id: string;
  brand: string | null;
  last4: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  createdAt: string;
};

export const listSavedCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedCardDTO[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("saved_cards")
      .select("id, brand, last4, holder_name, exp_month, exp_year, created_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      brand: r.brand,
      last4: r.last4,
      holderName: r.holder_name,
      expMonth: r.exp_month,
      expYear: r.exp_year,
      createdAt: r.created_at,
    }));
  });

type TokenizeInput = {
  number: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  cpf: string;
  postalCode: string;
  addressNumber: string;
  phone?: string;
};

export const tokenizeAndSaveCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: TokenizeInput) => {
    const number = (data?.number ?? "").replace(/\s+/g, "");
    if (number.length < 13 || number.length > 19)
      throw new Error("Número de cartão inválido");
    if (!/^\d{2}$/.test(data?.expiryMonth ?? ""))
      throw new Error("Validade inválida");
    if (!/^\d{4}$/.test(data?.expiryYear ?? ""))
      throw new Error("Validade inválida");
    if ((data?.ccv ?? "").length < 3) throw new Error("CVV inválido");
    if (!data?.holderName?.trim()) throw new Error("Nome do titular obrigatório");
    const cpf = (data?.cpf ?? "").replace(/\D/g, "");
    if (cpf.length !== 11) throw new Error("CPF inválido");
    return { ...data, number, cpf };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Limite: 5 tentativas/hora por usuário e por IP.
    {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const ip =
        getRequestHeader("cf-connecting-ip") ||
        (getRequestHeader("x-forwarded-for") ?? "").split(",")[0].trim() ||
        null;
      const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
      const { data: allowed, error: rlErr } = await (admin as any).rpc("check_card_tokenize_rate", {
        _user_id: userId,
        _ip: ip,
      });
      if (rlErr) throw new Error("Não foi possível validar o cadastro do cartão. Tente novamente.");
      if (!allowed)
        throw new Error("Muitas tentativas de cadastro de cartão. Tente novamente em 1 hora.");
    }

    // Ensure profile has CPF stored for future charges
    {
      const admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
      const { data: cur } = await (admin as any).from("profiles").select("cpf").eq("user_id", userId).single();
      if (cur?.cpf && cur.cpf.replace(/\D/g, "") !== data.cpf) throw new Error("O CPF do titular precisa ser o mesmo da sua conta.");
      if (!cur?.cpf) await (admin as any).from("profiles").update({ cpf: data.cpf }).eq("user_id", userId).is("cpf", null);
    }

    const last4FromInput = data.number.slice(-4);

    // 1) Se o usuário já tem esse cartão (ativo ou arquivado), reaproveita o token
    //    existente em vez de tentar tokenizar de novo no Asaas (que recusa duplicatas).
    const { data: existing } = await supabase
      .from("saved_cards")
      .select("id, brand, deleted_at")
      .eq("user_id", userId)
      .eq("last4", last4FromInput)
      .eq("exp_month", data.expiryMonth)
      .eq("exp_year", data.expiryYear)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.deleted_at) {
        await supabase
          .from("saved_cards")
          .update({ deleted_at: null, holder_name: data.holderName })
          .eq("id", existing.id)
          .eq("user_id", userId);
      }
      return {
        id: existing.id as string,
        last4: last4FromInput,
        brand: (existing.brand as string | null) ?? null,
        reused: true,
      };
    }

    const customerId = await ensureCustomerId(supabase, userId);


    const { data: userRes } = await supabase.auth.getUser();
    const email = userRes?.user?.email ?? "no-reply@monetisexy.app";

    const asaas = await loadAsaas();
    let tokenized;
    try {
      tokenized = await asaas.tokenizeCreditCard({
        customerId,
        creditCard: {
          holderName: data.holderName,
          number: data.number,
          expiryMonth: data.expiryMonth,
          expiryYear: data.expiryYear,
          ccv: data.ccv,
        },
        creditCardHolderInfo: {
          name: data.holderName,
          email,
          cpfCnpj: data.cpf,
          postalCode: (data.postalCode || "00000000").replace(/\D/g, ""),
          addressNumber: data.addressNumber || "0",
          phone: data.phone,
        },
      });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (/já\s+tokenizado|already\s+tokenized/i.test(msg)) {
        // O token existe no Asaas mas não temos a referência local.
        throw new Error("card_already_tokenized");
      }
      throw e;
    }

    const last4 = tokenized.creditCardNumber?.slice(-4) ?? last4FromInput;

    const { data: inserted, error } = await supabase
      .from("saved_cards")
      .insert({
        user_id: userId,
        asaas_customer_id: customerId,
        asaas_card_token: tokenized.creditCardToken,
        brand: tokenized.creditCardBrand ?? null,
        last4,
        holder_name: data.holderName,
        exp_month: data.expiryMonth,
        exp_year: data.expiryYear,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return {
      id: inserted.id as string,
      last4,
      brand: tokenized.creditCardBrand ?? null,
      reused: false,
    };
  });

export const deleteSavedCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Soft delete: preserva o token do Asaas para que o mesmo cartão possa
    // ser readicionado depois sem esbarrar em "cartão já tokenizado".
    const { error } = await supabase
      .from("saved_cards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const chargeSavedCardTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { savedCardId: string; amountCents: number }) => {
    if (!data?.savedCardId) throw new Error("Cartão não informado");
    if (!Number.isFinite(data?.amountCents) || data.amountCents < 1000)
      throw new Error("Recarga mínima é R$ 10,00");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: card, error } = await supabase
      .from("saved_cards")
      .select("id, asaas_customer_id, asaas_card_token")
      .eq("id", data.savedCardId)
      .eq("user_id", userId)
      .single();
    if (error || !card) throw new Error("Cartão não encontrado");

    const asaas = await loadAsaas();
    const payment = await asaas.createPayment({
      customerId: card.asaas_customer_id,
      billingType: "CREDIT_CARD",
      amountCents: data.amountCents,
      description: `Recarga carteira`,
      externalReference: `wallet_topup:${userId}`,
      creditCardToken: card.asaas_card_token,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: intent, error: iErr } = await supabaseAdmin
      .from("payment_intents")
      .insert({
        provider: "asaas",
        event_id: payment.id,
        event_type: "created",
        asaas_payment_id: payment.id,
        asaas_invoice_url: payment.invoiceUrl ?? null,
        method: "CREDIT_CARD",
        payload: payment as any,
        metadata: {
          referenceTable: "wallet_topups",
          referenceId: userId,
          amountCents: data.amountCents,
          buyerId: userId,
          savedCardId: card.id,
        },
      })
      .select("id")
      .single();
    if (iErr) throw new Error(iErr.message);

    return {
      paymentIntentId: intent.id as string,
      asaasPaymentId: payment.id,
      status: payment.status,
      invoiceUrl: payment.invoiceUrl ?? null,
    };
  });
