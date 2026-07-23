import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HiddenPublicationItem = {
  id: string;
  publication_id: string;
  caption: string | null;
  thumb_url: string | null;
  media_type: "image" | "video" | null;
  visibility: string;
  price_cents: number | null;
  author: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  created_at: string;
};

export const hidePublication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ publicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("publication_hides")
      .upsert(
        { user_id: context.userId, publication_id: data.publicationId },
        { onConflict: "user_id,publication_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unhidePublication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ publicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("publication_hides")
      .delete()
      .eq("user_id", context.userId)
      .eq("publication_id", data.publicationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyHiddenPublications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HiddenPublicationItem[]> => {
    const client = context.supabase;
    const { data: hides, error } = await client
      .from("publication_hides")
      .select("publication_id, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = hides ?? [];
    const ids = rows.map((r: any) => r.publication_id as string);
    if (ids.length === 0) return [];

    const [{ data: pubs }, { data: media }] = await Promise.all([
      client
        .from("publications")
        .select("id, author_id, caption, visibility, price_cents, preview_url")
        .in("id", ids),
      client
        .from("publication_media")
        .select("publication_id, url, type, position")
        .in("publication_id", ids)
        .order("position", { ascending: true }),
    ]);

    const pubMap = new Map<string, any>();
    (pubs ?? []).forEach((p: any) => pubMap.set(p.id, p));
    const mediaMap = new Map<string, any>();
    (media ?? []).forEach((m: any) => {
      if (!mediaMap.has(m.publication_id)) mediaMap.set(m.publication_id, m);
    });

    const authorIds = Array.from(
      new Set((pubs ?? []).map((p: any) => p.author_id as string)),
    );
    const authorMap = new Map<string, any>();
    if (authorIds.length) {
      const { data: profiles } = await client
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", authorIds);
      (profiles ?? []).forEach((p: any) => authorMap.set(p.user_id, p));
    }

    return rows
      .map((r: any) => {
        const p = pubMap.get(r.publication_id);
        if (!p) return null;
        const m = mediaMap.get(p.id);
        return {
          id: r.publication_id as string,
          publication_id: p.id as string,
          caption: p.caption as string | null,
          thumb_url: (m?.url ?? p.preview_url ?? null) as string | null,
          media_type: (m?.type ?? null) as any,
          visibility: p.visibility as string,
          price_cents: p.price_cents as number | null,
          author: authorMap.get(p.author_id) ?? null,
          created_at: r.created_at as string,
        } as HiddenPublicationItem;
      })
      .filter(Boolean) as HiddenPublicationItem[];
  });
