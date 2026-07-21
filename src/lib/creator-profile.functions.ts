import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ActiveCreatorProfile = {
  id: string;
  userId: string;
  kind: "paid" | "free";
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  priceMonthly: number | null;
  discountQuarterly: number;
  discountSemiannual: number;
  instagram: string | null;
  tiktok: string | null;
  x: string | null;
  chatWelcomeEnabled: boolean;
  chatWelcomeMessage: string | null;
  chatWelcomeMedia: unknown;
  chatWelcomeTag: string | null;
  chatWelcomePriceCents: number;
};

function mapRow(row: any): ActiveCreatorProfile {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind as "paid" | "free",
    username: row.username,
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    coverUrl: row.cover_url ?? null,
    bio: row.bio ?? null,
    priceMonthly: row.price_monthly != null ? Number(row.price_monthly) : null,
    discountQuarterly: row.discount_quarterly ?? 0,
    discountSemiannual: row.discount_semiannual ?? 0,
    instagram: row.instagram_handle ?? null,
    tiktok: row.tiktok_handle ?? null,
    x: row.x_handle ?? null,
    chatWelcomeEnabled: !!row.chat_welcome_enabled,
    chatWelcomeMessage: row.chat_welcome_message ?? null,
    chatWelcomeMedia: row.chat_welcome_media ?? [],
    chatWelcomeTag: row.chat_welcome_tag ?? null,
    chatWelcomePriceCents: row.chat_welcome_price_cents ?? 0,
  };
}

/**
 * Resolve o creator_profile ATIVO do usuário logado.
 * Usa profiles.active_profile_id; se ausente, prioriza o perfil pago.
 * Retorna null se o usuário não tem nenhum creator_profile.
 */
export const getMyActiveCreatorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActiveCreatorProfile | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("*, profiles!inner(active_profile_id)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    if (!rows.length) return null;
    const active = rows[0].profiles?.active_profile_id ?? null;
    const chosen =
      rows.find((r) => r.id === active) ??
      rows.find((r) => r.kind === "paid") ??
      rows[0];
    return mapRow(chosen);
  });

/**
 * Retorna todos os creator_profiles do usuário + qual é o ativo.
 * Usado pelo TopNav/BottomNav/switch bar sem precisar de segundo request.
 */
export const getMyCreatorProfilesWithActive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profRes, cpRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("active_profile_id, account_type, free_profile_enabled")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("creator_profiles").select("*").eq("user_id", userId),
    ]);
    if (profRes.error) throw new Error(profRes.error.message);
    if (cpRes.error) throw new Error(cpRes.error.message);
    const rows = ((cpRes.data ?? []) as any[]).map(mapRow);
    const activeId = profRes.data?.active_profile_id ?? null;
    const active =
      rows.find((r) => r.id === activeId) ??
      rows.find((r) => r.kind === "paid") ??
      rows[0] ??
      null;
    return {
      accountType: (profRes.data?.account_type ?? "subscriber") as
        | "subscriber"
        | "creator"
        | "free_creator",
      freeProfileEnabled: profRes.data?.free_profile_enabled === true,
      profiles: rows,
      active,
    };
  });

/**
 * Troca o creator_profile ativo do usuário logado.
 * Valida que o perfil pertence ao usuário.
 */
export const setActiveCreatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorProfileId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cp, error: readErr } = await supabase
      .from("creator_profiles")
      .select("id, kind")
      .eq("id", data.creatorProfileId)
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!cp) throw new Error("Perfil não encontrado");
    const { error } = await supabase
      .from("profiles")
      .update({
        active_profile_id: cp.id,
        active_view: cp.kind === "free" ? "free" : "creator",
      })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, kind: cp.kind };
  });
