import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Plan = "monthly" | "quarterly" | "semiannual";

const PLAN_DAYS: Record<Plan, number> = {
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
};

/**
 * Cria/renova a assinatura de um criador.
 * Sem gateway real: cria como `pending` (provider='manual').
 * Para simular pagamento imediato, chame `activateSubscription`.
 */
export const subscribeToCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId: string; plan?: Plan }) => ({
    creatorId: data.creatorId,
    plan: (data.plan ?? "monthly") as Plan,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (userId === data.creatorId) {
      throw new Error("Você não pode assinar seu próprio perfil.");
    }

    const { data: creator, error: creatorError } = await supabase
      .from("profiles")
      .select("price_monthly, discount_quarterly, discount_semiannual")
      .eq("user_id", data.creatorId)
      .maybeSingle();

    if (creatorError) throw new Error(creatorError.message);
    if (!creator?.price_monthly) {
      throw new Error("Este criador ainda não configurou o preço da assinatura.");
    }

    const monthlyCents = Math.round(Number(creator.price_monthly) * 100);
    let priceCents = monthlyCents;
    if (data.plan === "quarterly") {
      const pct = creator.discount_quarterly ?? 0;
      priceCents = Math.round(monthlyCents * 3 * (1 - pct / 100));
    } else if (data.plan === "semiannual") {
      const pct = creator.discount_semiannual ?? 0;
      priceCents = Math.round(monthlyCents * 6 * (1 - pct / 100));
    }

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + PLAN_DAYS[data.plan]);

    const { data: sub, error } = await supabase
      .from("subscriptions")
      .insert({
        subscriber_id: userId,
        creator_id: data.creatorId,
        plan: data.plan,
        price_cents_paid: priceCents,
        status: "pending",
        current_period_end: periodEnd.toISOString(),
        provider: "manual",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: sub.id, priceCents, plan: data.plan };
  });

/**
 * Marca uma assinatura como `active` (simula callback de pagamento).
 * O trigger no banco cria automaticamente a `transaction` correspondente.
 */
export const activateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscriptionId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", data.subscriptionId)
      .eq("subscriber_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Desativa renovação automática. Mantém acesso até o fim do ciclo pago.
 */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscriptionId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("subscriptions")
      .update({ auto_renew: false, cancelled_at: new Date().toISOString() })
      .eq("id", data.subscriptionId)
      .eq("subscriber_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Lista assinaturas ativas do usuário logado.
 */
export const listMySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, creator_id, plan, price_cents_paid, status, auto_renew, current_period_end, started_at")
      .eq("subscriber_id", userId)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Envia um mimo (gorjeta) ao criador em um post opcional.
 * Sem gateway real: cria como `paid` no modo manual para já refletir no dashboard.
 * Quando o PSP for integrado, muda para `pending` e o webhook faz virar `paid`.
 */
export const tipCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId: string; amountCents: number; message?: string; publicationId?: string }) => {
    if (!Number.isFinite(data.amountCents) || data.amountCents <= 0) {
      throw new Error("Valor do mimo inválido.");
    }
    return {
      creatorId: data.creatorId,
      amountCents: Math.floor(data.amountCents),
      message: data.message?.slice(0, 500) ?? null,
      publicationId: data.publicationId ?? null,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (userId === data.creatorId) {
      throw new Error("Você não pode enviar mimo para si mesmo.");
    }

    const { data: tip, error } = await supabase
      .from("tips")
      .insert({
        sender_id: userId,
        creator_id: data.creatorId,
        publication_id: data.publicationId,
        amount_cents: data.amountCents,
        message: data.message,
        status: "paid",
        provider: "manual",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: tip.id };
  });

/**
 * Desbloqueia uma publicação paga.
 * Sem gateway real: registra `paid` no modo manual; trigger cria a `transaction`
 * e a garantia de 60 dias de acesso.
 */
export const unlockPublication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { publicationId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pub, error: pubError } = await supabase
      .from("publications")
      .select("id, author_id, price_cents")
      .eq("id", data.publicationId)
      .maybeSingle();

    if (pubError) throw new Error(pubError.message);
    if (!pub) throw new Error("Publicação não encontrada.");
    if (!pub.price_cents || pub.price_cents <= 0) {
      throw new Error("Esta publicação não é paga.");
    }
    if (pub.author_id === userId) {
      throw new Error("Você é o autor desta publicação.");
    }

    const { data: unlock, error } = await supabase
      .from("publication_unlocks")
      .insert({
        publication_id: pub.id,
        buyer_id: userId,
        amount_cents: pub.price_cents,
        status: "paid",
        provider: "manual",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: unlock.id };
  });

/**
 * Seguir um creator (grátis, independente de assinatura).
 */
export const followCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (userId === data.creatorId) {
      throw new Error("Você não pode seguir a si mesmo.");
    }
    const { error } = await supabase
      .from("follows")
      .upsert(
        { follower_id: userId, followee_id: data.creatorId },
        { onConflict: "follower_id,followee_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Deixar de seguir um creator. Não afeta assinaturas.
 */
export const unfollowCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("followee_id", data.creatorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Assinatura gratuita para creators com price_monthly = 0/null.
 * Cria assinatura ativa com valor zero.
 */
export const subscribeFree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (userId === data.creatorId) {
      throw new Error("Você não pode assinar seu próprio perfil.");
    }

    const { data: creator, error: creatorError } = await supabase
      .from("profiles")
      .select("price_monthly")
      .eq("user_id", data.creatorId)
      .maybeSingle();
    if (creatorError) throw new Error(creatorError.message);
    if (creator?.price_monthly && Number(creator.price_monthly) > 0) {
      throw new Error("Este creator possui assinatura paga.");
    }

    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 10);

    const { error } = await supabase
      .from("subscriptions")
      .insert({
        subscriber_id: userId,
        creator_id: data.creatorId,
        plan: "monthly",
        price_cents_paid: 0,
        status: "active",
        current_period_end: periodEnd.toISOString(),
        started_at: new Date().toISOString(),
        provider: "manual",
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


