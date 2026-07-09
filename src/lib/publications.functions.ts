import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const mediaItemSchema = z.object({
  storagePath: z.string().min(1),
  url: z.string().url(),
  type: z.enum(["image", "video"]),
});

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
      .from("criativos")
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
  media: Array<{ id: string; url: string; type: "image" | "video"; position: number }>;
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

    let query = client
      .from("publications")
      .select(
        "id, author_id, caption, visibility, price_cents, challenge_cents, pinned, comments_disabled, expires_at, published_at",
      )
      .lte("published_at", new Date().toISOString())
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit + 1);

    if (data.cursor) query = query.lt("published_at", data.cursor);

    const { data: pubs, error } = await query;
    if (error) throw new Error(error.message);
    const rows = pubs ?? [];

    // Filtra expirados no server (RLS já filtra, mas defensivo).
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

    const [{ data: mediaRows }, { data: profileRows }] = await Promise.all([
      client
        .from("publication_media")
        .select("id, publication_id, url, type, position")
        .in("publication_id", ids)
        .order("position", { ascending: true }),
      client
        .from("profiles")
        .select("user_id, username")
        .in("user_id", authorIds),
    ]);

    const profileMap = new Map(
      (profileRows ?? []).map((r) => [r.user_id, r.username]),
    );

    const items: FeedItem[] = page.map((p) => {
      const isOwner = p.author_id === currentUserId;
      const isLocked = p.visibility !== "public" && !isOwner;
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
        // Se houver media retornada (autor ou usuário desbloqueado), mostra;
        // senão devolve array vazio p/ o card renderizar o estado bloqueado.
        media: isLocked && media.length === 0 ? [] : media,
      };
    });

    return { items, nextCursor };
  });
