import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Plan = "monthly" | "quarterly" | "semiannual";

const PLAN_DAYS: Record<Plan, number> = {
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
};

/**
 * Resolve o creator_profile alvo a partir de (creatorProfileId | creatorId).
 * Sempre retorna a linha completa de creator_profiles.
 */
async function resolveTargetProfile(
  supabase: any,
  input: { creatorProfileId?: string; creatorId?: string },
) {
  if (input.creatorProfileId) {
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("id, user_id, kind, price_monthly, discount_quarterly, discount_semiannual")
      .eq("id", input.creatorProfileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
  if (input.creatorId) {
    // Fallback: procura o perfil pago vinculado ao user_id. Se só existir free, retorna o free.
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("id, user_id, kind, price_monthly, discount_quarterly, discount_semiannual")
      .eq("user_id", input.creatorId);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    return rows.find((r) => r.kind === "paid") ?? rows[0] ?? null;
  }
  return null;
}

/**
 * Cria/renova assinatura de um creator.
 * Bloqueia perfis kind='free' (não vendem assinatura).
 */
export const subscribeToCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId?: string; creatorProfileId?: string; plan?: Plan }) => ({
    creatorId: data.creatorId,
    creatorProfileId: data.creatorProfileId,
    plan: (data.plan ?? "monthly") as Plan,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const target = await resolveTargetProfile(supabase, data);
    if (!target) throw new Error("Perfil de criador não encontrado.");
    if (target.user_id === userId) {
      throw new Error("Você não pode assinar seu próprio perfil.");
    }
    if (target.kind === "free") {
      throw new Error("Este perfil é gratuito e não vende assinatura.");
    }
    if (!target.price_monthly || Number(target.price_monthly) <= 0) {
      throw new Error("Este criador ainda não configurou o preço da assinatura.");
    }

    const monthlyCents = Math.round(Number(target.price_monthly) * 100);
    let priceCents = monthlyCents;
    if (data.plan === "quarterly") {
      const pct = target.discount_quarterly ?? 0;
      priceCents = Math.round(monthlyCents * 3 * (1 - pct / 100));
    } else if (data.plan === "semiannual") {
      const pct = target.discount_semiannual ?? 0;
      priceCents = Math.round(monthlyCents * 6 * (1 - pct / 100));
    }

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + PLAN_DAYS[data.plan]);

    const { data: sub, error } = await supabase
      .from("subscriptions")
      .insert({
        subscriber_id: userId,
        creator_id: target.user_id,
        creator_profile_id: target.id,
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

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscriptionId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Se a assinatura tem recorrência no Asaas, cancela lá primeiro para
    // evitar cobranças futuras. Mantém o acesso local até current_period_end.
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, asaas_subscription_id, subscriber_id")
      .eq("id", data.subscriptionId)
      .eq("subscriber_id", userId)
      .maybeSingle();
    if (!sub) throw new Error("Assinatura não encontrada");

    if (sub.asaas_subscription_id) {
      try {
        const asaas = await import("./asaas.server");
        await asaas.deleteAsaasSubscription(sub.asaas_subscription_id as string);
      } catch (err) {
        console.warn("[cancelSubscription] Asaas delete falhou", err);
      }
    }

    const { error } = await supabase
      .from("subscriptions")
      .update({
        auto_renew: false,
        cancelled_at: new Date().toISOString(),
        asaas_subscription_id: null,
      } as any)
      .eq("id", data.subscriptionId)
      .eq("subscriber_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Reativa a renovação automática recriando a assinatura no Asaas com um
 * cartão salvo. Só funciona enquanto o período atual ainda estiver ativo.
 */
export const reactivateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscriptionId: string; savedCardId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select(
        "id, subscriber_id, creator_id, plan, price_cents_paid, current_period_end, status",
      )
      .eq("id", data.subscriptionId)
      .eq("subscriber_id", userId)
      .maybeSingle();
    if (error || !sub) throw new Error("Assinatura não encontrada");
    if (new Date(sub.current_period_end as string).getTime() < Date.now()) {
      throw new Error("Assinatura expirada — faça uma nova assinatura");
    }

    const { data: card } = await supabase
      .from("saved_cards")
      .select("asaas_card_token, asaas_customer_id")
      .eq("id", data.savedCardId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!card) throw new Error("Cartão salvo não encontrado");

    const { data: creator } = await supabase
      .from("profiles")
      .select("asaas_wallet_id")
      .eq("user_id", sub.creator_id as string)
      .maybeSingle();
    const walletId = (creator as any)?.asaas_wallet_id as string | null;
    if (!walletId) throw new Error("Criador sem carteira configurada");

    const asaas = await import("./asaas.server");
    const amountCents = sub.price_cents_paid as number;
    const { netCreatorCents } = asaas.computeCreatorNetCents(amountCents, "CREDIT_CARD");
    const cycle =
      sub.plan === "quarterly"
        ? "QUARTERLY"
        : sub.plan === "semiannual"
          ? "SEMIANNUALLY"
          : "MONTHLY";
    const nextDueDate = new Date(sub.current_period_end as string)
      .toISOString()
      .slice(0, 10);

    const recurring = await asaas.createAsaasSubscription({
      customerId: card.asaas_customer_id as string,
      billingType: "CREDIT_CARD",
      amountCents,
      cycle,
      nextDueDate,
      description: `Assinatura MTX`,
      externalReference: `subscription:${sub.id}`,
      creatorWalletId: walletId,
      netCreatorCents,
      creditCardToken: card.asaas_card_token as string,
    });

    await supabase
      .from("subscriptions")
      .update({
        auto_renew: true,
        cancelled_at: null,
        asaas_subscription_id: recurring.id,
        status: sub.status === "past_due" ? "active" : sub.status,
      } as any)
      .eq("id", data.subscriptionId);

    return { ok: true, asaasSubscriptionId: recurring.id };
  });

export type MySubscription = {
  id: string;
  creatorId: string;
  creatorProfileId: string | null;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  creatorAvatarUrl: string | null;
  creatorAccountType: string | null;
  plan: string;
  priceCents: number;
  status: string;
  autoRenew: boolean;
  currentPeriodEnd: string;
  startedAt: string;
  cancelledAt: string | null;
  asaasSubscriptionId: string | null;
};

export const listMySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MySubscription[]> => {
    const { supabase, userId } = context;
    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select(
        "id, creator_id, creator_profile_id, plan, price_cents_paid, status, auto_renew, current_period_end, started_at, cancelled_at, asaas_subscription_id",
      )
      .eq("subscriber_id", userId)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = subs ?? [];
    if (!rows.length) return [];

    const cpIds = Array.from(
      new Set(rows.map((r) => r.creator_profile_id).filter(Boolean) as string[]),
    );
    const creatorIds = Array.from(new Set(rows.map((r) => r.creator_id as string)));

    const [cpRes, profRes] = await Promise.all([
      cpIds.length
        ? supabase
            .from("creator_profiles")
            .select("id, username, display_name, avatar_url, kind")
            .in("id", cpIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, account_type")
        .in("user_id", creatorIds),
    ]);

    const byCp = Object.fromEntries(((cpRes as any).data ?? []).map((r: any) => [r.id, r]));
    const byUid = Object.fromEntries(((profRes as any).data ?? []).map((r: any) => [r.user_id, r]));

    return rows.map((r) => {
      const cp = r.creator_profile_id ? byCp[r.creator_profile_id as string] : undefined;
      const p = byUid[r.creator_id as string];
      return {
        id: r.id as string,
        creatorId: r.creator_id as string,
        creatorProfileId: (r.creator_profile_id as string) ?? null,
        creatorUsername: cp?.username ?? p?.username ?? null,
        creatorDisplayName: cp?.display_name ?? p?.display_name ?? null,
        creatorAvatarUrl: cp?.avatar_url ?? p?.avatar_url ?? null,
        creatorAccountType: p?.account_type ?? null,
        plan: r.plan as string,
        priceCents: r.price_cents_paid ?? 0,
        status: r.status as string,
        autoRenew: r.auto_renew ?? false,
        currentPeriodEnd: (r.current_period_end as string) ?? null,
        startedAt: (r.started_at as string) ?? null,
        cancelledAt: ((r as any).cancelled_at as string) ?? null,
        asaasSubscriptionId: ((r as any).asaas_subscription_id as string) ?? null,
      };
    });
  });

/**
 * Lista assinantes ativos do PERFIL ATIVO do criador logado.
 * Perfis kind='free' nunca têm assinantes.
 */
export const listMySubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Resolve o creator_profile ativo.
    const [profRes, cpRes] = await Promise.all([
      supabase.from("profiles").select("active_profile_id").eq("user_id", userId).maybeSingle(),
      supabase.from("creator_profiles").select("id, kind").eq("user_id", userId),
    ]);
    const cps = ((cpRes.data ?? []) as any[]);
    const activeId = profRes.data?.active_profile_id ?? null;
    const active =
      cps.find((r) => r.id === activeId) ??
      cps.find((r) => r.kind === "paid") ??
      cps[0] ??
      null;

    // Perfil gratuito não tem assinantes.
    if (!active || active.kind === "free") return [];

    let query = supabase
      .from("subscriptions")
      .select(
        "id, subscriber_id, creator_profile_id, plan, price_cents_paid, started_at, current_period_end, status",
      )
      .in("status", ["active", "cancelled"])
      .gt("current_period_end", new Date().toISOString())
      .order("started_at", { ascending: false });

    // Escopa ao perfil ativo se houver, senão cai para user_id (legado).
    query = active.id
      ? query.eq("creator_profile_id", active.id)
      : query.eq("creator_id", userId);

    const { data: subs, error } = await query;
    if (error) throw new Error(error.message);
    const rows = subs ?? [];
    if (!rows.length) return [];

    const ids = Array.from(new Set(rows.map(r => r.subscriber_id as string)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", ids);
    const byId = Object.fromEntries((profs ?? []).map(p => [p.user_id as string, p]));

    return rows.map(r => {
      const p = byId[r.subscriber_id as string] as { username?: string | null; display_name?: string | null; avatar_url?: string | null } | undefined;
      return {
        id: r.id as string,
        subscriberId: r.subscriber_id as string,
        username: p?.username ?? null,
        displayName: p?.display_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
        plan: r.plan as string,
        priceCents: r.price_cents_paid ?? 0,
        startedAt: r.started_at as string,
        currentPeriodEnd: (r.current_period_end as string) ?? null,
      };
    });
  });

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
 * Seguir um creator. Aceita creatorProfileId (preferido) ou creatorId (legado
 * = perfil pago do usuário).
 */
export const followCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId?: string; creatorProfileId?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const target = await resolveTargetProfile(supabase, data);
    if (!target) throw new Error("Perfil não encontrado.");
    if (target.user_id === userId) {
      throw new Error("Você não pode seguir a si mesmo.");
    }
    const { error } = await supabase
      .from("follows")
      .upsert(
        {
          follower_id: userId,
          followee_id: target.user_id,
          creator_profile_id: target.id,
        },
        { onConflict: "follower_id,creator_profile_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true, creatorProfileId: target.id };
  });

export const unfollowCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId?: string; creatorProfileId?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const target = await resolveTargetProfile(supabase, data);
    if (!target) throw new Error("Perfil não encontrado.");
    let q = supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("creator_profile_id", target.id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Assinatura gratuita (para creators com price_monthly = 0/null).
 * Só permitida em perfis pagos que optaram por não cobrar; nunca em kind='free'.
 */
export const subscribeFree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId?: string; creatorProfileId?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const target = await resolveTargetProfile(supabase, data);
    if (!target) throw new Error("Perfil não encontrado.");
    if (target.user_id === userId) {
      throw new Error("Você não pode assinar seu próprio perfil.");
    }
    if (target.kind === "free") {
      throw new Error("Este perfil é gratuito e não vende assinatura.");
    }
    if (target.price_monthly && Number(target.price_monthly) > 0) {
      throw new Error("Este creator possui assinatura paga.");
    }

    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 10);

    const { error } = await supabase
      .from("subscriptions")
      .insert({
        subscriber_id: userId,
        creator_id: target.user_id,
        creator_profile_id: target.id,
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
