import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProfileIdFor } from "@/lib/profile-active.server";

const createPromotionSchema = z.object({
  name: z.string().trim().min(3).max(80),
  maxSubscriptions: z.number().int().min(10),
  durationDays: z.number().int().min(1).max(7),
  discountPct: z.number().int().min(5).max(60),
  description: z.string().max(100).default(""),
});

export const createPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createPromotionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    if (!profileId) throw new Error("Perfil de criador ativo não encontrado.");

    const { data: profile, error: profileErr } = await supabase
      .from("profiles_public")
      .select("price_monthly")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);

    const monthly = Number(profile?.price_monthly ?? 0);
    if (monthly < 21) {
      throw new Error("Preço da assinatura precisa ser R$21 ou mais para criar ofertas.");
    }

    const promo = Number((monthly * (1 - data.discountPct / 100)).toFixed(2));
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + data.durationDays * 24 * 60 * 60 * 1000);

    const { data: inserted, error } = await supabase
      .from("promotions")
      .insert({
        creator_id: userId,
        creator_profile_id: profileId,
        name: data.name,
        max_subscriptions: data.maxSubscriptions,
        duration_days: data.durationDays,
        discount_pct: data.discountPct,
        monthly_price_snapshot: monthly,
        promo_price: promo,
        description: data.description,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return inserted;
  });

export const listMyPromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    if (!profileId) return [];
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("creator_profile_id", profileId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const now = Date.now();
    return (data ?? []).map((p) => ({
      ...p,
      is_active: p.status === "active" && new Date(p.ends_at).getTime() > now,
    }));
  });

export const endPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("promotions")
      .update({ status: "ended" })
      .eq("id", data.id)
      .eq("creator_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: promo, error: fetchErr } = await supabase
      .from("promotions")
      .select("status, ends_at")
      .eq("id", data.id)
      .eq("creator_id", userId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!promo) throw new Error("Oferta não encontrada.");
    const stillActive =
      promo.status === "active" && new Date(promo.ends_at).getTime() > Date.now();
    if (stillActive) {
      throw new Error("Encerre a oferta antes de apagá-la.");
    }
    const { error } = await supabase
      .from("promotions")
      .delete()
      .eq("id", data.id)
      .eq("creator_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

