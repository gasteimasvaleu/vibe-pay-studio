import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MutedProfile = {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export const listMuted = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MutedProfile[]> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("muted_profiles")
      .select("id, muted_id, created_at")
      .eq("muter_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const ids = rows.map((r) => r.muted_id);
    const { data: profiles } = await supabase
      .from("profiles_public" as any)
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    return rows.map((r) => {
      const p = map.get(r.muted_id);
      return {
        id: r.id,
        userId: r.muted_id,
        username: p?.username ?? "usuário",
        displayName: (p?.display_name as string | null) ?? null,
        avatarUrl: (p?.avatar_url as string | null) ?? null,
        createdAt: r.created_at,
      };
    });
  });

export const muteProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.userId === userId) throw new Error("Você não pode silenciar a si mesmo.");
    const { error } = await supabase
      .from("muted_profiles")
      .upsert(
        { muter_id: userId, muted_id: data.userId },
        { onConflict: "muter_id,muted_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unmuteProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("muted_profiles")
      .delete()
      .eq("muter_id", userId)
      .eq("muted_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const isMuted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ muted: boolean }> => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("muted_profiles")
      .select("id")
      .eq("muter_id", userId)
      .eq("muted_id", data.userId)
      .maybeSingle();
    return { muted: !!row };
  });
