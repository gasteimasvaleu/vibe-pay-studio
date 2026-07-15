import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const mediaItemSchema = z.object({
  storagePath: z.string().min(1),
  url: z.string().url(),
  type: z.enum(["image", "video"]),
});

const audioSchema = z
  .object({
    storagePath: z.string().min(1),
    url: z.string().url(),
  })
  .nullable()
  .optional();

const previewSchema = z
  .object({
    storagePath: z.string().min(1),
    url: z.string().url(),
    type: z.enum(["image", "video"]),
  })
  .nullable()
  .optional();

const createPublicationSchema = z.object({
  caption: z.string().max(2000).optional().nullable(),
  visibility: z.enum(["public", "paid", "challenge"]),
  priceCents: z.number().int().min(0).nullable().optional(),
  challengeCents: z.number().int().min(0).nullable().optional(),
  expires24h: z.boolean(),
  scheduledAt: z.string().nullable().optional(),
  commentsDisabled: z.boolean(),
  pinned: z.boolean(),
  media: z.array(mediaItemSchema).min(1).max(10),
  audio: audioSchema,
  preview: previewSchema,
});

export const createPublication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createPublicationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const now = new Date();
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const publishedAt =
      scheduledAt && scheduledAt.getTime() > now.getTime() ? scheduledAt : now;
    const expiresAt = data.expires24h
      ? new Date(publishedAt.getTime() + 24 * 60 * 60 * 1000)
      : null;

    const { data: pub, error: pubErr } = await context.supabase
      .from("publications")
      .insert({
        author_id: context.userId,
        caption: data.caption ?? null,
        visibility: data.visibility,
        price_cents: data.visibility === "paid" ? data.priceCents ?? null : null,
        challenge_cents:
          data.visibility === "challenge" ? data.challengeCents ?? null : null,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
        comments_disabled: data.commentsDisabled,
        pinned: data.pinned,
        published_at: publishedAt.toISOString(),
        audio_url: data.audio?.url ?? null,
        audio_storage_path: data.audio?.storagePath ?? null,
        preview_url:
          data.visibility === "paid" ? data.preview?.url ?? null : null,
        preview_storage_path:
          data.visibility === "paid" ? data.preview?.storagePath ?? null : null,
      })
      .select("id")
      .single();

    if (pubErr || !pub) {
      throw new Error(pubErr?.message ?? "Falha ao criar publicação");
    }

    const rows = data.media.map((m, index) => ({
      publication_id: pub.id,
      storage_path: m.storagePath,
      url: m.url,
      type: m.type,
      position: index,
    }));

    const { error: mediaErr } = await context.supabase
      .from("publication_media")
      .insert(rows);

    if (mediaErr) {
      // rollback
      await context.supabase.from("publications").delete().eq("id", pub.id);
      throw new Error(mediaErr.message);
    }

    // TODO(Mercado Pago): quando visibility === 'paid' | 'challenge',
    // criar preferência de pagamento e retornar init_point para o front.
    return { ok: true as const, publicationId: pub.id };
  });

const deleteDraftSchema = z.object({ storagePath: z.string().min(1) });

export const deleteDraftMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteDraftSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Só o dono do arquivo (via RLS de storage.objects) consegue apagar.
    // storagePath esperado: posts/{userId}/drafts/{file}
    if (!data.storagePath.startsWith(`posts/${context.userId}/`)) {
      throw new Error("Forbidden");
    }
    const { error } = await context.supabase.storage
      .from("publications")
      .remove([data.storagePath]);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type FeedItem = {
  id: string;
  author_id: string;
  author_username: string | null;
  caption: string | null;
  visibility: "public" | "paid" | "challenge";
  price_cents: number | null;
  challenge_cents: number | null;
  pinned: boolean;
  comments_disabled: boolean;
  expires_at: string | null;
  published_at: string;
  locked: boolean;
  audio_url: string | null;
  media: Array<{ id: string; url: string; type: "image" | "video"; position: number }>;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  is_owner: boolean;
  archived_at: string | null;
};


const getFeedSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().datetime().optional(),
});

export const getFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => getFeedSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<{ items: FeedItem[]; nextCursor: string | null }> => {
    const limit = data.limit ?? 20;
    const client = context.supabase;
    const currentUserId = context.userId;

    const { data: follows, error: followsErr } = await client
      .from("follows")
      .select("followee_id")
      .eq("follower_id", currentUserId);
    if (followsErr) throw new Error(followsErr.message);
    const allowedAuthors = Array.from(
      new Set([currentUserId, ...(follows ?? []).map((f) => f.followee_id)]),
    );


    let query = client
      .from("publications")
      .select(
        "id, author_id, caption, visibility, price_cents, challenge_cents, pinned, comments_disabled, expires_at, published_at, audio_url",
      )
      .in("author_id", allowedAuthors)
      .lte("published_at", new Date().toISOString())
      .is("archived_at", null)
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit + 1);

    if (data.cursor) query = query.lt("published_at", data.cursor);




    const { data: pubs, error } = await query;
    if (error) throw new Error(error.message);
    const rows = pubs ?? [];

    const nowMs = Date.now();
    const visible = rows.filter(
      (p) => !p.expires_at || new Date(p.expires_at).getTime() > nowMs,
    );

    const page = visible.slice(0, limit);
    const nextCursor =
      visible.length > limit ? page[page.length - 1]!.published_at : null;

    if (page.length === 0) return { items: [], nextCursor: null };

    const ids = page.map((p) => p.id);
    const authorIds = Array.from(new Set(page.map((p) => p.author_id)));

    const [
      { data: mediaRows },
      { data: profileRows },
      { data: likeRows },
      { data: myLikeRows },
      { data: mySavedRows },
      { data: commentRows },
      { data: unlockRows },
    ] = await Promise.all([
      client
        .from("publication_media")
        .select("id, publication_id, url, type, position")
        .in("publication_id", ids)
        .order("position", { ascending: true }),
      client
        .from("profiles")
        .select("user_id, username")
        .in("user_id", authorIds),
      client
        .from("publication_likes")
        .select("publication_id")
        .in("publication_id", ids),
      client
        .from("publication_likes")
        .select("publication_id")
        .in("publication_id", ids)
        .eq("user_id", currentUserId),
      client
        .from("publication_bookmarks")
        .select("publication_id")
        .in("publication_id", ids)
        .eq("user_id", currentUserId),
      client
        .from("publication_comments")
        .select("publication_id")
        .in("publication_id", ids),
      client
        .from("publication_unlocks")
        .select("publication_id")
        .in("publication_id", ids)
        .eq("buyer_id", currentUserId)
        .eq("status", "paid"),
    ]);

    const profileMap = new Map(
      (profileRows ?? []).map((r) => [r.user_id, r.username]),
    );
    const likeCounts = new Map<string, number>();
    (likeRows ?? []).forEach((r) => {
      likeCounts.set(r.publication_id, (likeCounts.get(r.publication_id) ?? 0) + 1);
    });
    const commentCounts = new Map<string, number>();
    (commentRows ?? []).forEach((r) => {
      commentCounts.set(r.publication_id, (commentCounts.get(r.publication_id) ?? 0) + 1);
    });
    const likedSet = new Set((myLikeRows ?? []).map((r) => r.publication_id));
    const savedSet = new Set((mySavedRows ?? []).map((r) => r.publication_id));
    const unlockedSet = new Set((unlockRows ?? []).map((r) => r.publication_id));

    const items: FeedItem[] = page.map((p) => {
      const isOwner = p.author_id === currentUserId;
      const isUnlocked = isOwner || p.visibility === "public" || unlockedSet.has(p.id);
      const isLocked = !isUnlocked;
      const media = (mediaRows ?? [])
        .filter((m) => m.publication_id === p.id)
        .map((m) => ({
          id: m.id,
          url: m.url,
          type: m.type as "image" | "video",
          position: m.position,
        }));
      return {
        id: p.id,
        author_id: p.author_id,
        author_username: profileMap.get(p.author_id) ?? null,
        caption: p.caption,
        visibility: p.visibility as FeedItem["visibility"],
        price_cents: p.price_cents,
        challenge_cents: p.challenge_cents,
        pinned: p.pinned,
        comments_disabled: p.comments_disabled,
        expires_at: p.expires_at,
        published_at: p.published_at!,
        locked: isLocked,
        audio_url: (p as { audio_url: string | null }).audio_url ?? null,
        media: isLocked && media.length === 0 ? [] : media,
        like_count: likeCounts.get(p.id) ?? 0,
        comment_count: commentCounts.get(p.id) ?? 0,
        liked_by_me: likedSet.has(p.id),
        saved_by_me: savedSet.has(p.id),
        is_owner: isOwner,
        archived_at: null,
      };

    });

    return { items, nextCursor };
  });

const getUserPublicationsSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().datetime().optional(),
});

export const getUserPublications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => getUserPublicationsSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ items: FeedItem[]; nextCursor: string | null }> => {
    const limit = data.limit ?? 20;
    const client = context.supabase;
    const currentUserId = context.userId;

    let query = client
      .from("publications")
      .select(
        "id, author_id, caption, visibility, price_cents, challenge_cents, pinned, comments_disabled, expires_at, published_at, audio_url, archived_at",
      )

      .eq("author_id", data.userId)
      .lte("published_at", new Date().toISOString())
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit + 1);

    query = query.is("archived_at", null);
    void currentUserId;

    if (data.cursor) query = query.lt("published_at", data.cursor);


    const { data: pubs, error } = await query;
    if (error) throw new Error(error.message);
    const rows = pubs ?? [];

    const nowMs = Date.now();
    const visible = rows.filter(
      (p) => !p.expires_at || new Date(p.expires_at).getTime() > nowMs,
    );

    const page = visible.slice(0, limit);
    const nextCursor =
      visible.length > limit ? page[page.length - 1]!.published_at : null;

    if (page.length === 0) return { items: [], nextCursor: null };

    const ids = page.map((p) => p.id);

    const [
      { data: mediaRows },
      { data: authorRow },
      { data: likeRows },
      { data: myLikeRows },
      { data: mySavedRows },
      { data: commentRows },
      { data: unlockRows },
    ] = await Promise.all([
      client
        .from("publication_media")
        .select("id, publication_id, url, type, position")
        .in("publication_id", ids)
        .order("position", { ascending: true }),
      client
        .from("profiles")
        .select("user_id, username")
        .eq("user_id", data.userId)
        .maybeSingle(),
      client
        .from("publication_likes")
        .select("publication_id")
        .in("publication_id", ids),
      client
        .from("publication_likes")
        .select("publication_id")
        .in("publication_id", ids)
        .eq("user_id", currentUserId),
      client
        .from("publication_bookmarks")
        .select("publication_id")
        .in("publication_id", ids)
        .eq("user_id", currentUserId),
      client
        .from("publication_comments")
        .select("publication_id")
        .in("publication_id", ids),
      client
        .from("publication_unlocks")
        .select("publication_id")
        .in("publication_id", ids)
        .eq("buyer_id", currentUserId)
        .eq("status", "paid"),
    ]);

    const authorUsername = authorRow?.username ?? null;
    const likeCounts = new Map<string, number>();
    (likeRows ?? []).forEach((r) => {
      likeCounts.set(r.publication_id, (likeCounts.get(r.publication_id) ?? 0) + 1);
    });
    const commentCounts = new Map<string, number>();
    (commentRows ?? []).forEach((r) => {
      commentCounts.set(r.publication_id, (commentCounts.get(r.publication_id) ?? 0) + 1);
    });
    const likedSet = new Set((myLikeRows ?? []).map((r) => r.publication_id));
    const savedSet = new Set((mySavedRows ?? []).map((r) => r.publication_id));
    const unlockedSet = new Set((unlockRows ?? []).map((r) => r.publication_id));

    const items: FeedItem[] = page.map((p) => {
      const isOwner = p.author_id === currentUserId;
      const isUnlocked = isOwner || p.visibility === "public" || unlockedSet.has(p.id);
      const isLocked = !isUnlocked;
      const media = (mediaRows ?? [])
        .filter((m) => m.publication_id === p.id)
        .map((m) => ({
          id: m.id,
          url: m.url,
          type: m.type as "image" | "video",
          position: m.position,
        }));
      return {
        id: p.id,
        author_id: p.author_id,
        author_username: authorUsername,
        caption: p.caption,
        visibility: p.visibility as FeedItem["visibility"],
        price_cents: p.price_cents,
        challenge_cents: p.challenge_cents,
        pinned: p.pinned,
        comments_disabled: p.comments_disabled,
        expires_at: p.expires_at,
        published_at: p.published_at!,
        locked: isLocked,
        audio_url: (p as { audio_url: string | null }).audio_url ?? null,
        media: isLocked && media.length === 0 ? [] : media,
        like_count: likeCounts.get(p.id) ?? 0,
        comment_count: commentCounts.get(p.id) ?? 0,
        liked_by_me: likedSet.has(p.id),
        saved_by_me: savedSet.has(p.id),
        is_owner: isOwner,
        archived_at: (p as { archived_at: string | null }).archived_at ?? null,
      };

    });

    return { items, nextCursor };
  });


// ============================================================================
// Grid do perfil: postagens (capa) e mídias individuais, com paginação cursor.
// ============================================================================

export type GridPostItem = {
  id: string;
  cover_url: string | null;
  cover_type: "image" | "video" | null;
  media_count: number;
  has_audio: boolean;
  published_at: string;
};

export type GridMediaItem = {
  id: string;
  publication_id: string;
  url: string;
  type: "image" | "video";
  position: number;
  published_at: string;
};

const gridSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(60).optional(),
  cursor: z.string().optional(),
});

export type GridMediaFilter = "all" | "photos" | "videos" | "paid";

const mediaGridSchema = gridSchema.extend({
  filter: z.enum(["all", "photos", "videos", "paid"]).optional(),
});

export const getUserPostsGrid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => gridSchema.parse(d))
  .handler(
    async ({ data, context }): Promise<{ items: GridPostItem[]; nextCursor: string | null }> => {
      const limit = data.limit ?? 24;
      const client = context.supabase;

      let query = client
        .from("publications")
        .select("id, published_at, audio_url")
        .eq("author_id", data.userId)
        .is("archived_at", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(limit + 1);

      if (data.userId !== context.userId) {
        // já filtrado archived_at, nada extra
      }
      if (data.cursor) query = query.lt("published_at", data.cursor);

      const { data: pubs, error } = await query;
      if (error) throw new Error(error.message);
      const rows = pubs ?? [];
      const page = rows.slice(0, limit);
      const nextCursor = rows.length > limit ? page[page.length - 1]!.published_at! : null;
      if (page.length === 0) return { items: [], nextCursor: null };

      const ids = page.map((p) => p.id);
      const { data: mediaRows, error: mErr } = await client
        .from("publication_media")
        .select("publication_id, url, type, position")
        .in("publication_id", ids)
        .order("position", { ascending: true });
      if (mErr) throw new Error(mErr.message);

      const byPub = new Map<string, Array<{ url: string; type: "image" | "video"; position: number }>>();
      (mediaRows ?? []).forEach((m) => {
        const arr = byPub.get(m.publication_id) ?? [];
        arr.push({ url: m.url, type: m.type as "image" | "video", position: m.position });
        byPub.set(m.publication_id, arr);
      });

      const items: GridPostItem[] = page.map((p) => {
        const media = byPub.get(p.id) ?? [];
        const cover = media[0] ?? null;
        return {
          id: p.id,
          cover_url: cover?.url ?? null,
          cover_type: cover ? cover.type : null,
          media_count: media.length,
          has_audio: !!(p as { audio_url: string | null }).audio_url,
          published_at: p.published_at!,
        };
      });

      return { items, nextCursor };
    },
  );

export const getUserMediasGrid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => mediaGridSchema.parse(d))
  .handler(
    async ({ data, context }): Promise<{ items: GridMediaItem[]; nextCursor: string | null }> => {
      const limit = data.limit ?? 24;
      const client = context.supabase;
      const filter = data.filter ?? "all";

      // Estratégia: paginação por publicações. Cada página retorna todas as
      // mídias das próximas `limit` publicações do autor. O cursor é o
      // published_at da última publicação consumida.
      let pubQuery = client
        .from("publications")
        .select("id, published_at, visibility, price_cents")
        .eq("author_id", data.userId)
        .is("archived_at", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(limit);

      if (filter === "paid") {
        pubQuery = pubQuery.eq("visibility", "paid").gt("price_cents", 0);
      }

      if (data.cursor) pubQuery = pubQuery.lt("published_at", data.cursor);

      const { data: pubs, error } = await pubQuery;
      if (error) throw new Error(error.message);
      const pubRows = pubs ?? [];
      if (pubRows.length === 0) return { items: [], nextCursor: null };

      const ids = pubRows.map((p) => p.id);
      let mediaQuery = client
        .from("publication_media")
        .select("id, publication_id, url, type, position")
        .in("publication_id", ids);

      if (filter === "photos") mediaQuery = mediaQuery.eq("type", "image");
      else if (filter === "videos") mediaQuery = mediaQuery.eq("type", "video");

      const { data: mediaRows, error: mErr } = await mediaQuery;
      if (mErr) throw new Error(mErr.message);

      const pubOrder = new Map(pubRows.map((p, i) => [p.id, i]));
      const pubDate = new Map(pubRows.map((p) => [p.id, p.published_at!]));
      const sorted = (mediaRows ?? []).slice().sort((a, b) => {
        const oa = pubOrder.get(a.publication_id) ?? 0;
        const ob = pubOrder.get(b.publication_id) ?? 0;
        if (oa !== ob) return oa - ob;
        return a.position - b.position;
      });

      const items: GridMediaItem[] = sorted.map((m) => ({
        id: m.id,
        publication_id: m.publication_id,
        url: m.url,
        type: m.type as "image" | "video",
        position: m.position,
        published_at: pubDate.get(m.publication_id)!,
      }));

      // Se o número de publicações retornadas atingiu o limite, provavelmente
      // há mais páginas: usamos o published_at da última como cursor.
      const nextCursor =
        pubRows.length === limit ? pubRows[pubRows.length - 1]!.published_at! : null;

      return { items, nextCursor };
    },
  );



const idSchema = z.object({ publicationId: z.string().uuid() });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ liked: boolean; likeCount: number }> => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("publication_likes")
      .select("user_id")
      .eq("publication_id", data.publicationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("publication_likes")
        .delete()
        .eq("publication_id", data.publicationId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("publication_likes")
        .insert({ publication_id: data.publicationId, user_id: userId });
      if (error) throw new Error(error.message);
    }

    const { count } = await supabase
      .from("publication_likes")
      .select("*", { count: "exact", head: true })
      .eq("publication_id", data.publicationId);

    return { liked: !existing, likeCount: count ?? 0 };
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ saved: boolean }> => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("publication_bookmarks")
      .select("user_id")
      .eq("publication_id", data.publicationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("publication_bookmarks")
        .delete()
        .eq("publication_id", data.publicationId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { saved: false };
    }
    const { error } = await supabase
      .from("publication_bookmarks")
      .insert({ publication_id: data.publicationId, user_id: userId });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export type PublicationComment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author_username: string | null;
  parent_id: string | null;
  like_count: number;
  viewer_liked: boolean;
};

export const listComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }): Promise<PublicationComment[]> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("publication_comments")
      .select("id, body, created_at, user_id, parent_id")
      .eq("publication_id", data.publicationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const list = rows ?? [];
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    const commentIds = list.map((r) => r.id);

    let profileMap = new Map<string, string | null>();
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);
      profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p.username]),
      );
    }

    const likeCount = new Map<string, number>();
    const likedByMe = new Set<string>();
    if (commentIds.length) {
      const { data: likeRows } = await supabase
        .from("publication_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);
      for (const l of likeRows ?? []) {
        likeCount.set(l.comment_id, (likeCount.get(l.comment_id) ?? 0) + 1);
        if (l.user_id === userId) likedByMe.add(l.comment_id);
      }
    }

    return list.map((r) => ({
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      user_id: r.user_id,
      author_username: profileMap.get(r.user_id) ?? null,
      parent_id: r.parent_id ?? null,
      like_count: likeCount.get(r.id) ?? 0,
      viewer_liked: likedByMe.has(r.id),
    }));
  });

const addCommentSchema = z.object({
  publicationId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().uuid().nullable().optional(),
});

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addCommentSchema.parse(d))
  .handler(async ({ data, context }): Promise<PublicationComment> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("publication_comments")
      .insert({
        publication_id: data.publicationId,
        user_id: userId,
        body: data.body,
        parent_id: data.parentId ?? null,
      })
      .select("id, body, created_at, user_id, parent_id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao comentar");

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      user_id: row.user_id,
      author_username: profile?.username ?? null,
      parent_id: row.parent_id ?? null,
      like_count: 0,
      viewer_liked: false,
    };
  });

const commentIdSchema = z.object({ commentId: z.string().uuid() });

export const toggleCommentLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => commentIdSchema.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ liked: boolean; likeCount: number }> => {
      const { supabase, userId } = context;
      const { data: existing } = await supabase
        .from("publication_comment_likes")
        .select("comment_id")
        .eq("comment_id", data.commentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("publication_comment_likes")
          .delete()
          .eq("comment_id", data.commentId)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("publication_comment_likes")
          .insert({ comment_id: data.commentId, user_id: userId });
        if (error) throw new Error(error.message);
      }

      const { count } = await supabase
        .from("publication_comment_likes")
        .select("comment_id", { count: "exact", head: true })
        .eq("comment_id", data.commentId);

      return { liked: !existing, likeCount: count ?? 0 };
    },
  );

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => commentIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("publication_comments")
      .delete()
      .eq("id", data.commentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });



const publicationIdSchema = z.object({ id: z.string().uuid() });

type PubOwnerClient = {
  from: (table: "publications") => {
    select: (cols: "id, author_id") => {
      eq: (col: "id", value: string) => {
        maybeSingle: () => Promise<{
          data: { id: string; author_id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

async function assertPublicationOwner(
  supabase: unknown,
  publicationId: string,
  userId: string,
) {
  const client = supabase as PubOwnerClient;
  const { data, error } = await client
    .from("publications")
    .select("id, author_id")
    .eq("id", publicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Publicação não encontrada");
  if (data.author_id !== userId) throw new Error("Sem permissão");
}



export const updatePublicationCaption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    publicationIdSchema
      .extend({ caption: z.string().max(2000).nullable() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPublicationOwner(context.supabase, data.id, context.userId);
    const { error } = await context.supabase
      .from("publications")
      .update({ caption: data.caption })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setPublicationCommentsDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    publicationIdSchema.extend({ disabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPublicationOwner(context.supabase, data.id, context.userId);
    const { error } = await context.supabase
      .from("publications")
      .update({ comments_disabled: data.disabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const, disabled: data.disabled };
  });

export const setPublicationArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    publicationIdSchema.extend({ archived: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPublicationOwner(context.supabase, data.id, context.userId);
    const { error } = await context.supabase
      .from("publications")
      .update({ archived_at: data.archived ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const, archived: data.archived };
  });

export const deletePublication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => publicationIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertPublicationOwner(context.supabase, data.id, context.userId);

    const [{ data: mediaRows }, { data: pubRow }] = await Promise.all([
      context.supabase
        .from("publication_media")
        .select("storage_path")
        .eq("publication_id", data.id),
      context.supabase
        .from("publications")
        .select("audio_storage_path, preview_storage_path")
        .eq("id", data.id)
        .maybeSingle(),
    ]);

    const paths = [
      ...(mediaRows ?? []).map((m) => m.storage_path).filter(Boolean),
      pubRow?.audio_storage_path,
      pubRow?.preview_storage_path,
    ].filter((p): p is string => typeof p === "string" && p.length > 0);

    if (paths.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("publications").remove(paths);
    }

    const { error } = await context.supabase
      .from("publications")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ============================================================================
// Posts arquivados: apenas do próprio usuário logado.
// ============================================================================

const getArchivedSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().datetime().optional(),
});

export const getArchivedPublications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => getArchivedSchema.parse(d ?? {}))
  .handler(
    async ({ data, context }): Promise<{ items: FeedItem[]; nextCursor: string | null }> => {
      const limit = data.limit ?? 10;
      const client = context.supabase;
      const currentUserId = context.userId;

      let query = client
        .from("publications")
        .select(
          "id, author_id, caption, visibility, price_cents, challenge_cents, pinned, comments_disabled, expires_at, published_at, audio_url, archived_at",
        )
        .eq("author_id", currentUserId)
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false })
        .limit(limit + 1);

      if (data.cursor) query = query.lt("archived_at", data.cursor);

      const { data: pubs, error } = await query;
      if (error) throw new Error(error.message);
      const rows = pubs ?? [];

      const page = rows.slice(0, limit);
      const nextCursor =
        rows.length > limit
          ? (page[page.length - 1] as { archived_at: string | null }).archived_at ?? null
          : null;

      if (page.length === 0) return { items: [], nextCursor: null };

      const ids = page.map((p) => p.id);

      const [
        { data: mediaRows },
        { data: profileRow },
        { data: likeRows },
        { data: myLikeRows },
        { data: mySavedRows },
        { data: commentRows },
      ] = await Promise.all([
        client
          .from("publication_media")
          .select("id, publication_id, url, type, position")
          .in("publication_id", ids)
          .order("position", { ascending: true }),
        client
          .from("profiles")
          .select("user_id, username")
          .eq("user_id", currentUserId)
          .maybeSingle(),
        client
          .from("publication_likes")
          .select("publication_id")
          .in("publication_id", ids),
        client
          .from("publication_likes")
          .select("publication_id")
          .in("publication_id", ids)
          .eq("user_id", currentUserId),
        client
          .from("publication_bookmarks")
          .select("publication_id")
          .in("publication_id", ids)
          .eq("user_id", currentUserId),
        client
          .from("publication_comments")
          .select("publication_id")
          .in("publication_id", ids),
      ]);

      const authorUsername = profileRow?.username ?? null;
      const likeCounts = new Map<string, number>();
      (likeRows ?? []).forEach((r) => {
        likeCounts.set(r.publication_id, (likeCounts.get(r.publication_id) ?? 0) + 1);
      });
      const commentCounts = new Map<string, number>();
      (commentRows ?? []).forEach((r) => {
        commentCounts.set(r.publication_id, (commentCounts.get(r.publication_id) ?? 0) + 1);
      });
      const likedSet = new Set((myLikeRows ?? []).map((r) => r.publication_id));
      const savedSet = new Set((mySavedRows ?? []).map((r) => r.publication_id));

      const items: FeedItem[] = page.map((p) => {
        const media = (mediaRows ?? [])
          .filter((m) => m.publication_id === p.id)
          .map((m) => ({
            id: m.id,
            url: m.url,
            type: m.type as "image" | "video",
            position: m.position,
          }));
        return {
          id: p.id,
          author_id: p.author_id,
          author_username: authorUsername,
          caption: p.caption,
          visibility: p.visibility as FeedItem["visibility"],
          price_cents: p.price_cents,
          challenge_cents: p.challenge_cents,
          pinned: p.pinned,
          comments_disabled: p.comments_disabled,
          expires_at: p.expires_at,
          published_at: p.published_at!,
          locked: false,
          audio_url: (p as { audio_url: string | null }).audio_url ?? null,
          media,
          like_count: likeCounts.get(p.id) ?? 0,
          comment_count: commentCounts.get(p.id) ?? 0,
          liked_by_me: likedSet.has(p.id),
          saved_by_me: savedSet.has(p.id),
          is_owner: true,
          archived_at: (p as { archived_at: string | null }).archived_at ?? null,
        };
      });

      return { items, nextCursor };
    },
  );
