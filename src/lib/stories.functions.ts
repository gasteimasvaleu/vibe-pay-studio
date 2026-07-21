import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SIGNED_URL_TTL = 60 * 60; // 1h

const publishSchema = z.object({
  mediaPath: z.string().min(1),
  mediaType: z.enum(["image", "video"]),
  thumbPath: z.string().nullable().optional(),
  priceCents: z.number().int().min(0).max(100000).default(0),
  caption: z.string().max(280).nullable().optional(),
});

export const publishStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => publishSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!profile || !["creator", "free_creator"].includes(profile.account_type)) {
      throw new Error("apenas creators podem publicar stories");
    }
    const { data: row, error } = await context.supabase
      .from("stories")
      .insert({
        creator_id: context.userId,
        media_path: data.mediaPath,
        media_type: data.mediaType,
        thumb_path: data.thumbPath ?? null,
        price_cents: data.priceCents ?? 0,
        caption: data.caption ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("stories")
      .select("id, media_path, thumb_path, creator_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("story não encontrado");
    if (row.creator_id !== context.userId) throw new Error("não autorizado");
    const paths = [row.media_path, row.thumb_path].filter(Boolean) as string[];
    if (paths.length) {
      await context.supabase.storage.from("stories").remove(paths);
    }
    const { error } = await context.supabase.from("stories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type StoryRingItem = {
  creator_id: string;
  username: string;
  avatar_url: string | null;
  latest_at: string;
  count: number;
  unseen: number;
  is_self: boolean;
};

export const getFeedStoryRings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoryRingItem[]> => {
    const { data: follows } = await context.supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", context.userId);
    const authorIds = Array.from(
      new Set([context.userId, ...(follows ?? []).map((f) => f.followee_id)]),
    );
    if (authorIds.length === 0) return [];

    const { data: stories, error } = await context.supabase
      .from("stories")
      .select("id, creator_id, published_at")
      .in("creator_id", authorIds)
      .gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!stories || stories.length === 0) return [];

    const storyIds = stories.map((s) => s.id);
    const { data: views } = await context.supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", context.userId)
      .in("story_id", storyIds);
    const seen = new Set((views ?? []).map((v) => v.story_id));

    const uniqueCreators = Array.from(new Set(stories.map((s) => s.creator_id)));
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", uniqueCreators);
    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.user_id,
        { username: p.username as string, avatar_url: (p.avatar_url ?? null) as string | null },
      ]),
    );

    const grouped = new Map<string, StoryRingItem>();
    for (const s of stories) {
      const existing = grouped.get(s.creator_id);
      const isUnseen = !seen.has(s.id);
      if (existing) {
        existing.count += 1;
        if (isUnseen) existing.unseen += 1;
      } else {
        const prof = profileMap.get(s.creator_id);
        grouped.set(s.creator_id, {
          creator_id: s.creator_id,
          username: prof?.username ?? "creator",
          avatar_url: prof?.avatar_url ?? null,
          latest_at: s.published_at,
          count: 1,
          unseen: isUnseen ? 1 : 0,
          is_self: s.creator_id === context.userId,
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      // self first, then unseen desc, then latest
      if (a.is_self !== b.is_self) return a.is_self ? -1 : 1;
      if ((b.unseen > 0 ? 1 : 0) !== (a.unseen > 0 ? 1 : 0))
        return (b.unseen > 0 ? 1 : 0) - (a.unseen > 0 ? 1 : 0);
      return b.latest_at.localeCompare(a.latest_at);
    });
  });

export type StoryItem = {
  id: string;
  creator_id: string;
  creator_username: string;
  creator_avatar_url: string | null;
  media_type: "image" | "video";
  price_cents: number;
  caption: string | null;
  published_at: string;
  expires_at: string;
  media_url: string | null;
  thumb_url: string | null;
  unlocked: boolean;
  is_self: boolean;
  viewed: boolean;
};

async function signedFor(
  supabase: any,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("stories")
    .createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

export const getCreatorStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ creatorId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<StoryItem[]> => {
    const { data: stories, error } = await context.supabase
      .from("stories")
      .select(
        "id, creator_id, media_path, thumb_path, media_type, price_cents, caption, published_at, expires_at",
      )
      .eq("creator_id", data.creatorId)
      .gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!stories || stories.length === 0) return [];

    const ids = stories.map((s) => s.id);
    const [{ data: unlocks }, { data: views }] = await Promise.all([
      context.supabase
        .from("story_unlocks")
        .select("story_id")
        .eq("buyer_id", context.userId)
        .eq("status", "paid")
        .in("story_id", ids),
      context.supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", context.userId)
        .in("story_id", ids),
    ]);
    const unlockedSet = new Set((unlocks ?? []).map((u) => u.story_id));
    const viewedSet = new Set((views ?? []).map((v) => v.story_id));

    const results: StoryItem[] = [];
    for (const s of stories) {
      const isSelf = s.creator_id === context.userId;
      const unlocked = isSelf || (s.price_cents ?? 0) === 0 || unlockedSet.has(s.id);
      const mediaUrl = unlocked ? await signedFor(context.supabase, s.media_path) : null;
      const thumbUrl = await signedFor(context.supabase, s.thumb_path ?? s.media_path);
      results.push({
        id: s.id,
        creator_id: s.creator_id,
        media_type: s.media_type as "image" | "video",
        price_cents: s.price_cents ?? 0,
        caption: s.caption ?? null,
        published_at: s.published_at,
        expires_at: s.expires_at,
        media_url: mediaUrl,
        thumb_url: thumbUrl,
        unlocked,
        is_self: isSelf,
        viewed: viewedSet.has(s.id),
      });
    }
    return results;
  });

export const markStoryViewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ storyId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("story_views")
      .upsert(
        { story_id: data.storyId, viewer_id: context.userId },
        { onConflict: "story_id,viewer_id", ignoreDuplicates: true },
      );
    return { ok: true };
  });
