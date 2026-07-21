import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ThreadListItem = {
  threadId: string;
  partnerId: string;
  partnerUsername: string;
  partnerAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  isMuted: boolean;
};

export type ChatWelcomeMedia = {
  path: string;
  mime: string;
  kind: "image" | "video" | "audio";
  durationSec?: number | null;
  url?: string | null;
};

export type ChatStoryReply = {
  storyId: string;
  mediaType: "image" | "video";
  caption: string | null;
  thumbPath: string | null;
  thumbUrl?: string | null;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  priceCents: number | null;
  unlocked: boolean;
  metadata?: {
    welcome?: boolean;
    tag?: string | null;
    media?: ChatWelcomeMedia[];
    storyReply?: ChatStoryReply;
  } | null;
};


export type PartnerProfile = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ThreadListItem[]> => {
    const { supabase, userId } = context;
    const { data: threads, error } = await supabase
      .from("chat_threads")
      .select("id, user_a, user_b, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    if (!threads || threads.length === 0) return [];

    const partnerIds = Array.from(
      new Set(threads.map((t) => (t.user_a === userId ? t.user_b : t.user_a))),
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", partnerIds);
    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, p]),
    );

    const results: ThreadListItem[] = [];
    for (const t of threads) {
      const partnerId = t.user_a === userId ? t.user_b : t.user_a;
      const profile = profileMap.get(partnerId);

      const { data: lastMsgRows } = await supabase
        .from("chat_messages")
        .select("content")
        .eq("thread_id", t.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const { count: unread } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", t.id)
        .is("read_at", null)
        .neq("sender_id", userId);

      results.push({
        threadId: t.id,
        partnerId,
        partnerUsername: profile?.username ?? "usuário",
        partnerAvatar: null,
        lastMessage: lastMsgRows?.[0]?.content ?? null,
        lastMessageAt: t.last_message_at,
        unreadCount: unread ?? 0,
      });
    }

    return results;
  });

export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ query: z.string().min(1).max(50) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<PartnerProfile[]> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("user_id, username")
      .ilike("username", `%${data.query}%`)
      .neq("user_id", userId)
      .limit(20);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      userId: r.user_id,
      username: r.username,
      avatarUrl: null,
    }));
  });

export const openThreadWith = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ threadId: string }> => {
    const { supabase } = context;
    const { data: threadId, error } = await supabase.rpc(
      "get_or_create_thread",
      { other_user: data.userId },
    );
    if (error) throw new Error(error.message);
    return { threadId: threadId as string };
  });

export const getThreadWithPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ threadId: z.string().uuid() }).parse(data),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ messages: ChatMessage[]; partner: PartnerProfile }> => {
      const { supabase, userId } = context;
      const { data: thread, error: tErr } = await supabase
        .from("chat_threads")
        .select("id, user_a, user_b")
        .eq("id", data.threadId)
        .maybeSingle();
      if (tErr) throw new Error(tErr.message);
      if (!thread) throw new Error("Conversa não encontrada");
      const partnerId = thread.user_a === userId ? thread.user_b : thread.user_a;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, username")
        .eq("user_id", partnerId)
        .maybeSingle();

      const { data: msgs, error: mErr } = await supabase
        .from("chat_messages")
        .select("id, thread_id, sender_id, content, read_at, created_at, price_cents, metadata")
        .eq("thread_id", data.threadId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (mErr) throw new Error(mErr.message);

      const paidPartnerMsgIds = (msgs ?? [])
        .filter((m) => m.sender_id !== userId && (m.price_cents ?? 0) > 0)
        .map((m) => m.id);
      const unlockedSet = new Set<string>();
      if (paidPartnerMsgIds.length > 0) {
        const { data: unlocks } = await supabase
          .from("chat_message_unlocks")
          .select("message_id, status")
          .eq("buyer_id", userId)
          .in("message_id", paidPartnerMsgIds)
          .eq("status", "paid");
        for (const u of unlocks ?? []) unlockedSet.add(u.message_id);
      }

      // Collect media paths across messages and sign in one batch
      const allPaths: string[] = [];
      const storyThumbPaths: string[] = [];
      for (const m of msgs ?? []) {
        const media = ((m as any).metadata?.media ?? []) as ChatWelcomeMedia[];
        for (const it of media) if (it?.path) allPaths.push(it.path);
        const sr = (m as any).metadata?.storyReply as ChatStoryReply | undefined;
        if (sr?.thumbPath) storyThumbPaths.push(sr.thumbPath);
      }
      const urlByPath = new Map<string, string>();
      if (allPaths.length > 0) {
        const { data: signed } = await supabase.storage
          .from("publications")
          .createSignedUrls(Array.from(new Set(allPaths)), 60 * 60);
        for (const s of signed ?? []) {
          if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
        }
      }
      const storyUrlByPath = new Map<string, string>();
      if (storyThumbPaths.length > 0) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: signed } = await supabaseAdmin.storage
          .from("stories")
          .createSignedUrls(Array.from(new Set(storyThumbPaths)), 60 * 60);
        for (const s of signed ?? []) {
          if (s.path && s.signedUrl) storyUrlByPath.set(s.path, s.signedUrl);
        }
      }

      return {
        partner: {
          userId: partnerId,
          username: profile?.username ?? "usuário",
          avatarUrl: null,
        },
        messages: (msgs ?? []).map((m: any) => {
          const price = m.price_cents ?? 0;
          const mine = m.sender_id === userId;
          const meta = m.metadata ?? null;
          const media: ChatWelcomeMedia[] | undefined = meta?.media
            ? (meta.media as ChatWelcomeMedia[]).map((it) => ({
                ...it,
                url: urlByPath.get(it.path) ?? null,
              }))
            : undefined;
          const rawSr = meta?.storyReply as ChatStoryReply | undefined;
          const storyReply: ChatStoryReply | undefined = rawSr
            ? {
                ...rawSr,
                thumbUrl: rawSr.thumbPath ? storyUrlByPath.get(rawSr.thumbPath) ?? null : null,
              }
            : undefined;
          return {
            id: m.id,
            threadId: m.thread_id,
            senderId: m.sender_id,
            content: m.content,
            readAt: m.read_at,
            createdAt: m.created_at,
            priceCents: price > 0 ? price : null,
            unlocked: price <= 0 || mine || unlockedSet.has(m.id),
            metadata: meta
              ? { welcome: !!meta.welcome, tag: meta.tag ?? null, media, storyReply }
              : null,
          };
        }),
      };
    },
  );


export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
        content: z.string().min(1).max(4000),
        priceCents: z.number().int().min(0).max(50000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<ChatMessage> => {
    const { supabase, userId } = context;
    const price = data.priceCents ?? 0;
    const { data: row, error } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: data.threadId,
        sender_id: userId,
        content: data.content,
        price_cents: price,
      })
      .select("id, thread_id, sender_id, content, read_at, created_at, price_cents")
      .single();
    if (error) throw new Error(error.message);
    const finalPrice = row.price_cents ?? 0;
    return {
      id: row.id,
      threadId: row.thread_id,
      senderId: row.sender_id,
      content: row.content,
      readAt: row.read_at,
      createdAt: row.created_at,
      priceCents: finalPrice > 0 ? finalPrice : null,
      unlocked: true,
    };
  });

export const sendStoryReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        storyId: z.string().uuid(),
        content: z.string().min(1).max(4000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ threadId: string; messageId: string }> => {
    const { supabase, userId } = context;
    // Load story (RLS: viewer must be able to see it — creators/subscribers/unlockers via story policies)
    const { data: story, error: sErr } = await supabase
      .from("stories")
      .select("id, creator_id, media_type, media_path, thumb_path, caption")
      .eq("id", data.storyId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!story) throw new Error("Story não encontrado");
    if (story.creator_id === userId) throw new Error("Você não pode responder ao próprio story");

    // Enforce active subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("subscriber_id", userId)
      .eq("creator_id", story.creator_id)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    if (!sub) throw new Error("Você precisa ser assinante para responder");

    // Ensure thread
    const { data: threadId, error: tErr } = await supabase.rpc("get_or_create_thread", {
      other_user: story.creator_id,
    });
    if (tErr) throw new Error(tErr.message);

    const storyReply: ChatStoryReply = {
      storyId: story.id,
      mediaType: story.media_type as "image" | "video",
      caption: (story.caption as string | null) ?? null,
      thumbPath: (story.thumb_path ?? story.media_path) as string | null,
    };

    const { data: row, error } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: threadId as string,
        sender_id: userId,
        content: data.content,
        price_cents: 0,
        metadata: { storyReply } as unknown as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { threadId: threadId as string, messageId: row.id };
  });




export const markThreadRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ threadId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("chat_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("thread_id", data.threadId)
      .neq("sender_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Welcome message settings ----

const welcomeMediaSchema = z.object({
  path: z.string().min(1).max(500),
  mime: z.string().min(1).max(120),
  kind: z.enum(["image", "video", "audio"]),
  durationSec: z.number().nonnegative().max(60 * 60).nullable().optional(),
});

export type ChatWelcomeSettings = {
  enabled: boolean;
  message: string;
  media: ChatWelcomeMedia[];
  tag: string | null;
  priceCents: number;
};

export const getChatWelcome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChatWelcomeSettings> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("chat_welcome_enabled, chat_welcome_message, chat_welcome_media, chat_welcome_tag, chat_welcome_price_cents")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const raw = (data?.chat_welcome_media ?? []) as ChatWelcomeMedia[];
    const paths = raw.map((r) => r.path).filter(Boolean);
    const urlByPath = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await supabase.storage
        .from("publications")
        .createSignedUrls(paths, 60 * 60);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
      }
    }
    return {
      enabled: !!data?.chat_welcome_enabled,
      message: data?.chat_welcome_message ?? "",
      tag: data?.chat_welcome_tag ?? null,
      priceCents: (data as any)?.chat_welcome_price_cents ?? 0,
      media: raw.map((m) => ({ ...m, url: urlByPath.get(m.path) ?? null })),
    };
  });

export const updateChatWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        enabled: z.boolean(),
        message: z.string().max(4000).optional(),
        media: z.array(welcomeMediaSchema).max(10).default([]),
        tag: z.string().trim().max(40).nullable().optional(),
        priceCents: z.number().int().min(0).max(50000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const msg = (data.message ?? "").trim();
    const media = data.media ?? [];
    const price = data.priceCents ?? 0;
    if (data.enabled && msg.length < 3 && media.length === 0) {
      throw new Error("Adicione uma mensagem (mín. 3 caracteres) ou uma mídia");
    }
    if (price > 0 && media.length === 0) {
      throw new Error("Adicione uma mídia para poder precificar a mensagem");
    }
    const prefix = `chat-welcome/${userId}/`;
    for (const m of media) {
      if (!m.path.startsWith(prefix)) throw new Error("Caminho de mídia inválido");
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        chat_welcome_enabled: data.enabled,
        chat_welcome_message: msg || null,
        chat_welcome_media: media as unknown as never,
        chat_welcome_tag: data.tag?.trim() || null,
        chat_welcome_price_cents: price,
      } as any)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createChatWelcomeUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        filename: z.string().min(1).max(200),
        mime: z.string().min(1).max(120),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const path = `chat-welcome/${userId}/${crypto.randomUUID()}-${safe}`;
    const { data: signed, error } = await supabase.storage
      .from("publications")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "upload_url_failed");
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

