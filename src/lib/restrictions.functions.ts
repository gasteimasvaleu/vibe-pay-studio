import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RestrictedSubscriber = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  restrictedAt: string;
};

export type SubscriberCandidate = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export const listRestrictedSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RestrictedSubscriber[]> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("subscriber_restrictions")
      .select("subscriber_id, created_at")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const ids = rows.map((r) => r.subscriber_id);
    const { data: profiles } = await supabase
      .from("profiles_public" as any)
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    return rows.map((r) => {
      const p = map.get(r.subscriber_id) as
        | { username: string; display_name: string | null; avatar_url: string | null }
        | undefined;
      return {
        userId: r.subscriber_id,
        username: p?.username ?? "usuário",
        displayName: p?.display_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
        restrictedAt: r.created_at,
      };
    });
  });

export const restrictSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ subscriberId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.subscriberId === userId) {
      throw new Error("Você não pode restringir a si mesmo.");
    }
    const { error } = await supabase
      .from("subscriber_restrictions")
      .upsert(
        { creator_id: userId, subscriber_id: data.subscriberId },
        { onConflict: "creator_id,subscriber_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const unrestrictSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ subscriberId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("subscriber_restrictions")
      .delete()
      .eq("creator_id", userId)
      .eq("subscriber_id", data.subscriberId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const isSubscriberRestricted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ subscriberId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ restricted: boolean }> => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("subscriber_restrictions")
      .select("subscriber_id")
      .eq("creator_id", userId)
      .eq("subscriber_id", data.subscriberId)
      .maybeSingle();
    return { restricted: !!row };
  });

export const searchSubscribersToRestrict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ q: z.string().min(1).max(50) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<SubscriberCandidate[]> => {
    const { supabase, userId } = context;

    // Ativos atualmente
    const { data: subs, error: subsErr } = await supabase
      .from("subscriptions")
      .select("subscriber_id")
      .eq("creator_id", userId)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .limit(500);
    if (subsErr) throw new Error(subsErr.message);
    const subscriberIds = Array.from(
      new Set((subs ?? []).map((s) => s.subscriber_id as string)),
    );
    if (subscriberIds.length === 0) return [];

    // Excluir os já restritos
    const { data: already } = await supabase
      .from("subscriber_restrictions")
      .select("subscriber_id")
      .eq("creator_id", userId);
    const restrictedSet = new Set(
      (already ?? []).map((r) => r.subscriber_id as string),
    );
    const eligible = subscriberIds.filter((id) => !restrictedSet.has(id));
    if (eligible.length === 0) return [];

    const { data: profiles, error: profErr } = await supabase
      .from("profiles_public" as any)
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", eligible)
      .ilike("username", `%${data.q}%`)
      .limit(20);
    if (profErr) throw new Error(profErr.message);

    return (profiles ?? []).map((p) => ({
      userId: p.user_id as string,
      username: p.username as string,
      displayName: (p.display_name as string | null) ?? null,
      avatarUrl: (p.avatar_url as string | null) ?? null,
    }));
  });
