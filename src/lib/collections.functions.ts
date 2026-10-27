import { createServerFn } from "@tanstack/react-start";
import { signField } from "@/lib/media-sign.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CollectionPubItem = {
  id: string;
  publication_id: string;
  caption: string | null;
  thumb_url: string | null;
  media_type: "image" | "video" | null;
  visibility: string;
  price_cents: number | null;
  author: { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
  created_at: string;
  amount_cents?: number;
};

export type ChatPurchaseItem = {
  id: string;
  thread_id: string;
  message_preview: string | null;
  amount_cents: number;
  created_at: string;
  creator: { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

export type TipSentItem = {
  id: string;
  amount_cents: number;
  message: string | null;
  publication_id: string | null;
  created_at: string;
  creator: { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

async function fetchAuthorsMap(client: any, ids: string[]) {
  if (ids.length === 0) return new Map();
  const { data } = await client
    .from("profiles_public")
    .select("user_id, username, display_name, avatar_url")
    .in("user_id", ids);
  const m = new Map<string, any>();
  (data ?? []).forEach((p: any) => m.set(p.user_id, p));
  return m;
}

async function hydratePublications(client: any, pubIds: string[]) {
  if (pubIds.length === 0) return { pubs: new Map(), media: new Map(), authors: new Map() };
  const [{ data: pubs }, { data: media }] = await Promise.all([
    client
      .from("publications")
      .select("id, author_id, caption, visibility, price_cents, preview_url, created_at")
      .in("id", pubIds),
    client
      .from("publication_media")
      .select("publication_id, url, type, position")
      .in("publication_id", pubIds)
      .order("position", { ascending: true }),
  ]);
  const pubMap = new Map<string, any>();
  (pubs ?? []).forEach((p: any) => pubMap.set(p.id, p));
  const mediaMap = new Map<string, any>();
  (media ?? []).forEach((m: any) => {
    if (!mediaMap.has(m.publication_id)) mediaMap.set(m.publication_id, m);
  });
  const authorIds = Array.from(new Set((pubs ?? []).map((p: any) => p.author_id))) as string[];
  const authors = await fetchAuthorsMap(client, authorIds);
  return { pubs: pubMap, media: mediaMap, authors };
}

export const listMyBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CollectionPubItem[]> => {
    const { supabase, userId } = context;
    const { data: bms, error } = await supabase
      .from("publication_bookmarks")
      .select("publication_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = bms ?? [];
    const ids = rows.map((r: any) => r.publication_id);
    const { pubs, media, authors } = await hydratePublications(supabase, ids);
    return signField(rows
      .map((r: any) => {
        const p = pubs.get(r.publication_id);
        if (!p) return null;
        const m = media.get(p.id);
        const thumb = m?.url ?? p.preview_url ?? null;
        return {
          id: p.id,
          publication_id: p.id,
          caption: p.caption,
          thumb_url: thumb,
          media_type: (m?.type ?? null) as any,
          visibility: p.visibility,
          price_cents: p.price_cents,
          author: authors.get(p.author_id) ?? null,
          created_at: r.created_at,
        } as CollectionPubItem;
      })
      .filter(Boolean) as CollectionPubItem[], (it: any) => it.thumb_url, (it: any, v) => { it.thumb_url = v; });
  });

export const listMyPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CollectionPubItem[]> => {
    const { supabase, userId } = context;
    const { data: unlocks, error } = await supabase
      .from("publication_unlocks")
      .select("publication_id, amount_cents, created_at, status")
      .eq("buyer_id", userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = unlocks ?? [];
    const ids = Array.from(new Set(rows.map((r: any) => r.publication_id)));
    const { pubs, media, authors } = await hydratePublications(supabase, ids);
    return signField(rows
      .map((r: any) => {
        const p = pubs.get(r.publication_id);
        if (!p) return null;
        const m = media.get(p.id);
        const thumb = m?.url ?? p.preview_url ?? null;
        return {
          id: r.id,
          publication_id: p.id,
          caption: p.caption,
          thumb_url: thumb,
          media_type: (m?.type ?? null) as any,
          visibility: p.visibility,
          price_cents: p.price_cents,
          author: authors.get(p.author_id) ?? null,
          created_at: r.created_at,
          amount_cents: r.amount_cents,
        } as CollectionPubItem;
      })
      .filter(Boolean) as CollectionPubItem[], (it: any) => it.thumb_url, (it: any, v) => { it.thumb_url = v; });
  });

export const listMyChatPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChatPurchaseItem[]> => {
    const { supabase, userId } = context;
    const { data: unlocks, error } = await supabase
      .from("chat_message_unlocks")
      .select("id, message_id, creator_id, amount_cents, created_at, status")
      .eq("buyer_id", userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = unlocks ?? [];
    const msgIds = rows.map((r: any) => r.message_id);
    const creatorIds = Array.from(new Set(rows.map((r: any) => r.creator_id)));
    const [{ data: msgs }, creators] = await Promise.all([
      msgIds.length
        ? (supabase as any).from("chat_messages_safe").select("id, thread_id, content").in("id", msgIds)
        : Promise.resolve({ data: [] as any[] }),
      fetchAuthorsMap(supabase, creatorIds),
    ]);
    const msgMap = new Map<string, any>();
    (msgs ?? []).forEach((m: any) => msgMap.set(m.id, m));
    return rows.map((r: any) => {
      const msg = msgMap.get(r.message_id);
      return {
        id: r.id,
        thread_id: msg?.thread_id ?? "",
        message_preview: msg?.content ? String(msg.content).slice(0, 120) : null,
        amount_cents: r.amount_cents,
        created_at: r.created_at,
        creator: creators.get(r.creator_id) ?? null,
      } as ChatPurchaseItem;
    });
  });

export const listMyTipsSent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TipSentItem[]> => {
    const { supabase, userId } = context;
    const { data: tips, error } = await supabase
      .from("tips")
      .select("id, creator_id, publication_id, amount_cents, message, created_at, status")
      .eq("sender_id", userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = tips ?? [];
    const creatorIds = Array.from(new Set(rows.map((r: any) => r.creator_id)));
    const creators = await fetchAuthorsMap(supabase, creatorIds);
    return rows.map((r: any) => ({
      id: r.id,
      amount_cents: r.amount_cents,
      message: r.message,
      publication_id: r.publication_id,
      created_at: r.created_at,
      creator: creators.get(r.creator_id) ?? null,
    }));
  });
