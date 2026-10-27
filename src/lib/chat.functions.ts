import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProfileIdFor } from "@/lib/profile-active.server";

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

export type ChatCallInvite = {
  callId: string;
  priceCents: number;
  durationMin: number;
  expiresAt: string;
  status?: "pending_payment" | "paid" | "expired" | "cancelled";
  paidAt?: string | null;
};

export type ChatTipMeta = {
  tipId: string;
  amountCents: number;
};

export type ChatPaidUploadMeta = {
  requestId: string;
  priceCents: number;
};

export type ChatReplyPreview = {
  messageId: string;
  senderId: string;
  snippet: string;
  hasMedia: boolean;
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
  deletedAt?: string | null;
  metadata?: {
    welcome?: boolean;
    tag?: string | null;
    media?: ChatWelcomeMedia[];
    storyReply?: ChatStoryReply;
    callInvite?: ChatCallInvite;
    tip?: ChatTipMeta;
    paidUpload?: ChatPaidUploadMeta;
    replyTo?: ChatReplyPreview;
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
    const activeProfileId = await getActiveProfileIdFor(supabase, userId);
    const { data: threads, error } = await supabase
      .from("chat_threads")
      .select(
        "id, user_a, user_b, user_a_profile_id, user_b_profile_id, last_message_at, cleared_at_a, cleared_at_b, deleted_at_a, deleted_at_b",
      )
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    if (!threads || threads.length === 0) return [];

    // Filter out threads deleted by this user (unless a new message arrived after)
    // AND filter by active persona: my side must match my active profile OR be null (legacy).
    const visible = threads.filter((t) => {
      const side = t.user_a === userId ? "a" : "b";
      const deletedAt = side === "a" ? t.deleted_at_a : t.deleted_at_b;
      if (deletedAt && !(t.last_message_at && new Date(t.last_message_at) > new Date(deletedAt))) {
        return false;
      }
      const mySideProfile = side === "a" ? t.user_a_profile_id : t.user_b_profile_id;
      if (mySideProfile && activeProfileId && mySideProfile !== activeProfileId) return false;
      return true;
    });
    if (visible.length === 0) return [];

    const partnerIds = Array.from(
      new Set(visible.map((t) => (t.user_a === userId ? t.user_b : t.user_a))),
    );

    const { data: profiles } = await supabase
      .from("profiles_public" as any)
      .select("user_id, username, avatar_url")
      .in("user_id", partnerIds);
    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.user_id, p]),
    );


    const { data: mutedRows } = await supabase
      .from("muted_profiles")
      .select("muted_id")
      .eq("muter_id", userId)
      .in("muted_id", partnerIds);
    const mutedSet = new Set((mutedRows ?? []).map((r) => r.muted_id));

    const results: ThreadListItem[] = [];
    for (const t of visible) {
      const partnerId = t.user_a === userId ? t.user_b : t.user_a;
      const profile = profileMap.get(partnerId);
      const side = t.user_a === userId ? "a" : "b";
      const clearedAt = side === "a" ? t.cleared_at_a : t.cleared_at_b;

      let lastMsgQuery = supabase
        .from("chat_messages")
        .select("content")
        .eq("thread_id", t.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (clearedAt) lastMsgQuery = lastMsgQuery.gt("created_at", clearedAt);
      const { data: lastMsgRows } = await lastMsgQuery;

      let unreadQuery = supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", t.id)
        .is("read_at", null)
        .neq("sender_id", userId);
      if (clearedAt) unreadQuery = unreadQuery.gt("created_at", clearedAt);
      const { count: unread } = await unreadQuery;

      results.push({
        threadId: t.id,
        partnerId,
        partnerUsername: profile?.username ?? "usuário",
        partnerAvatar: (profile as { avatar_url?: string | null } | undefined)?.avatar_url ?? null,
        lastMessage: lastMsgRows?.[0]?.content ?? null,
        lastMessageAt: t.last_message_at,
        unreadCount: unread ?? 0,
        isMuted: mutedSet.has(partnerId),
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
      .from("profiles_public" as any)
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
    const { supabase, userId } = context;
    const { data: threadId, error } = await supabase.rpc(
      "get_or_create_thread",
      { other_user: data.userId },
    );
    if (error) throw new Error(error.message);
    // Stamp my side's active persona on the thread (best-effort).
    const activeProfileId = await getActiveProfileIdFor(supabase, userId);
    if (activeProfileId && threadId) {
      const { data: row } = await supabase
        .from("chat_threads")
        .select("user_a, user_a_profile_id, user_b_profile_id")
        .eq("id", threadId as string)
        .maybeSingle();
      if (row) {
        const patch: { user_a_profile_id?: string; user_b_profile_id?: string } = {};
        if (row.user_a === userId && !row.user_a_profile_id) patch.user_a_profile_id = activeProfileId;
        if (row.user_a !== userId && !row.user_b_profile_id) patch.user_b_profile_id = activeProfileId;
        if (Object.keys(patch).length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("chat_threads") as any).update(patch).eq("id", threadId as string);
        }
      }
    }
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
        .from("profiles_public" as any)
        .select("user_id, username, avatar_url, active_profile_id")
        .eq("user_id", partnerId)
        .maybeSingle();

      let partnerAvatar: string | null =
        (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null;
      let partnerUsername = profile?.username ?? "usuário";
      const activeProfileId = (profile as { active_profile_id?: string | null } | null)
        ?.active_profile_id;
      if (activeProfileId) {
        const { data: cp } = await supabase
          .from("creator_profiles")
          .select("username, avatar_url")
          .eq("id", activeProfileId)
          .maybeSingle();
        if (cp) {
          partnerAvatar =
            (cp as { avatar_url?: string | null }).avatar_url ?? partnerAvatar;
          partnerUsername = (cp as { username?: string | null }).username ?? partnerUsername;
        }
      }


      const { data: threadRow } = await supabase
        .from("chat_threads")
        .select("cleared_at_a, cleared_at_b")
        .eq("id", data.threadId)
        .maybeSingle();
      const mySide = thread.user_a === userId ? "a" : "b";
      const clearedAt =
        mySide === "a"
          ? (threadRow as { cleared_at_a?: string | null } | null)?.cleared_at_a
          : (threadRow as { cleared_at_b?: string | null } | null)?.cleared_at_b;

      let msgQuery = supabase
        .from("chat_messages")
        .select("id, thread_id, sender_id, content, read_at, created_at, price_cents, metadata, deleted_at, reply_to_id")
        .eq("thread_id", data.threadId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (clearedAt) msgQuery = msgQuery.gt("created_at", clearedAt);
      const { data: msgsRaw, error: mErr } = await msgQuery;
      if (mErr) throw new Error(mErr.message);

      // Filter out messages this user has hidden ("apagar para mim")
      const allIds = (msgsRaw ?? []).map((m) => m.id);
      const hiddenSet = new Set<string>();
      if (allIds.length > 0) {
        const { data: hides } = await supabase
          .from("chat_message_hides")
          .select("message_id")
          .eq("user_id", userId)
          .in("message_id", allIds);
        for (const h of hides ?? []) hiddenSet.add(h.message_id);
      }
      const msgs = (msgsRaw ?? []).filter((m) => !hiddenSet.has(m.id));

      const paidPartnerMsgIds = msgs
        .filter((m) => m.sender_id !== userId && (m.price_cents ?? 0) > 0 && !m.deleted_at)
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
      const publicationPaths: string[] = [];
      const paidDmPaths: string[] = [];
      const storyThumbPaths: string[] = [];
      for (const m of msgs ?? []) {
        const media = ((m as any).metadata?.media ?? []) as ChatWelcomeMedia[];
        const paidUpload = (m as any).metadata?.paidUpload as ChatPaidUploadMeta | undefined;
        for (const it of media) {
          if (it?.path) {
            if (paidUpload) paidDmPaths.push(it.path);
            else publicationPaths.push(it.path);
          }
        }
        const sr = (m as any).metadata?.storyReply as ChatStoryReply | undefined;
        if (sr?.thumbPath) storyThumbPaths.push(sr.thumbPath);
      }
      const urlByPath = new Map<string, string>();
      if (publicationPaths.length > 0) {
        const { data: signed } = await supabase.storage
          .from("publications")
          .createSignedUrls(Array.from(new Set(publicationPaths)), 60 * 60);
        for (const s of signed ?? []) {
          if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
        }
      }
      if (paidDmPaths.length > 0) {
        const { data: signed } = await supabase.storage
          .from("chat-paid-uploads")
          .createSignedUrls(Array.from(new Set(paidDmPaths)), 60 * 60);
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

      // Build map for reply previews
      const msgById = new Map<string, any>();
      for (const m of msgs) msgById.set(m.id, m);
      const missingParentIds = new Set<string>();
      for (const m of msgs) {
        if (m.reply_to_id && !msgById.has(m.reply_to_id)) missingParentIds.add(m.reply_to_id);
      }
      if (missingParentIds.size > 0) {
        const { data: parents } = await supabase
          .from("chat_messages")
          .select("id, sender_id, content, metadata, deleted_at")
          .in("id", Array.from(missingParentIds));
        for (const p of parents ?? []) msgById.set(p.id, p);
      }

      function buildReplyPreview(parentId: string | null): ChatReplyPreview | undefined {
        if (!parentId) return undefined;
        const p = msgById.get(parentId);
        if (!p) return undefined;
        if (p.deleted_at) {
          return { messageId: p.id, senderId: p.sender_id, snippet: "Mensagem apagada", hasMedia: false };
        }
        const pMedia = (p.metadata?.media ?? []) as ChatWelcomeMedia[];
        const hasMedia = pMedia.length > 0;
        const rawText = (p.content ?? "").trim();
        const snippet = rawText
          ? rawText.length > 80
            ? rawText.slice(0, 80) + "…"
            : rawText
          : hasMedia
            ? pMedia[0].kind === "image"
              ? "📷 Foto"
              : pMedia[0].kind === "video"
                ? "🎬 Vídeo"
                : "🎙️ Áudio"
            : "Mensagem";
        return { messageId: p.id, senderId: p.sender_id, snippet, hasMedia };
      }

      return {
        partner: {
          userId: partnerId,
          username: partnerUsername,
          avatarUrl: partnerAvatar,
        },
        messages: msgs.map((m: any) => {
          const price = m.price_cents ?? 0;
          const mine = m.sender_id === userId;
          const deletedAt = m.deleted_at ?? null;
          const meta = deletedAt ? null : m.metadata ?? null;
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
          const replyTo = buildReplyPreview(m.reply_to_id ?? null);
          return {
            id: m.id,
            threadId: m.thread_id,
            senderId: m.sender_id,
            content: deletedAt ? "" : m.content,
            readAt: m.read_at,
            createdAt: m.created_at,
            deletedAt,
            priceCents: deletedAt ? null : price > 0 ? price : null,
            unlocked: deletedAt ? true : price <= 0 || mine || unlockedSet.has(m.id),
            metadata: deletedAt
              ? { replyTo }
              : meta
                ? {
                    welcome: !!meta.welcome,
                    tag: meta.tag ?? null,
                    media,
                    storyReply,
                    callInvite: meta.callInvite ?? undefined,
                    tip: meta.tip ?? undefined,
                    paidUpload: meta.paidUpload ?? undefined,
                    replyTo,
                  }
                : replyTo
                  ? { replyTo }
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
        content: z.string().max(4000).default(""),
        priceCents: z.number().int().min(0).max(50000).optional(),
        replyToId: z.string().uuid().optional(),
        media: z
          .array(
            z.object({
              path: z.string().min(1),
              mime: z.string().min(1),
              kind: z.enum(["image", "video", "audio"]),
              durationSec: z.number().int().positive().optional(),
            }),
          )
          .max(10)
          .optional(),
      })
      .refine((v) => (v.content?.trim().length ?? 0) > 0 || (v.media?.length ?? 0) > 0, {
        message: "Mensagem vazia",
      })
      .refine((v) => (v.priceCents ?? 0) === 0 || (v.media?.length ?? 0) > 0, {
        message: "Anexe uma mídia para definir um preço",
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<ChatMessage> => {
    const { supabase, userId } = context;
    const price = data.priceCents ?? 0;
    const metadata =
      data.media && data.media.length > 0 ? ({ media: data.media } as unknown as never) : ({} as unknown as never);

    // Stamp sender's active persona on legacy threads (best-effort) so future
    // inbox reads by other personas of this account no longer see it.
    const activeProfileId = await getActiveProfileIdFor(supabase, userId);
    if (activeProfileId) {
      const { data: tRow } = await supabase
        .from("chat_threads")
        .select("user_a, user_a_profile_id, user_b_profile_id")
        .eq("id", data.threadId)
        .maybeSingle();
      if (tRow) {
        const patch: { user_a_profile_id?: string; user_b_profile_id?: string } = {};
        if (tRow.user_a === userId && !tRow.user_a_profile_id) patch.user_a_profile_id = activeProfileId;
        if (tRow.user_a !== userId && !tRow.user_b_profile_id) patch.user_b_profile_id = activeProfileId;
        if (Object.keys(patch).length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("chat_threads") as any).update(patch).eq("id", data.threadId);
        }
      }
    }

    const { data: row, error } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: data.threadId,
        sender_id: userId,
        content: data.content ?? "",
        price_cents: price,
        reply_to_id: data.replyToId ?? null,
        metadata,
      })

      .select("id, thread_id, sender_id, content, read_at, created_at, price_cents, metadata")
      .single();
    if (error) throw new Error(error.message);
    // Reset "deleted for me" flags so the thread reappears for both sides
    await supabase
      .from("chat_threads")
      .update({ deleted_at_a: null, deleted_at_b: null })
      .eq("id", data.threadId);
    const finalPrice = row.price_cents ?? 0;
    // Sign URLs for returned media so it renders immediately
    const mediaOut = (row as { metadata?: { media?: ChatWelcomeMedia[] } }).metadata?.media;
    let signedMedia: ChatWelcomeMedia[] | undefined;
    if (mediaOut && mediaOut.length > 0) {
      const { data: signed } = await supabase.storage
        .from("publications")
        .createSignedUrls(mediaOut.map((m) => m.path), 60 * 60);
      const map = new Map<string, string>();
      for (const s of signed ?? []) if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
      signedMedia = mediaOut.map((m) => ({ ...m, url: map.get(m.path) ?? null }));
    }
    return {
      id: row.id,
      threadId: row.thread_id,
      senderId: row.sender_id,
      content: row.content,
      readAt: row.read_at,
      createdAt: row.created_at,
      priceCents: finalPrice > 0 ? finalPrice : null,
      unlocked: true,
      metadata: signedMedia ? { media: signedMedia } : null,
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

export type PaidDmSettings = {
  enabled: boolean;
  minCents: number;
  maxCents: number;
};

export const getPaidDmSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaidDmSettings> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles_public" as any)
      .select("paid_dm_upload_enabled, paid_dm_upload_min_cents, paid_dm_upload_max_cents")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      enabled: !!data?.paid_dm_upload_enabled,
      minCents: data?.paid_dm_upload_min_cents ?? 100,
      maxCents: data?.paid_dm_upload_max_cents ?? 50000,
    };
  });

export const updatePaidDmSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        enabled: z.boolean(),
        minCents: z.number().int().min(0).max(50000),
        maxCents: z.number().int().min(0).max(50000),
      })
      .refine((v) => v.minCents <= v.maxCents, "O mínimo deve ser menor ou igual ao máximo")
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<PaidDmSettings> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        paid_dm_upload_enabled: data.enabled,
        paid_dm_upload_min_cents: data.minCents,
        paid_dm_upload_max_cents: data.maxCents,
      })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return data;
  });

async function getThreadSide(
  supabase: any,
  userId: string,
  threadId: string,
): Promise<"a" | "b"> {
  const { data: t, error } = await supabase
    .from("chat_threads")
    .select("user_a, user_b")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!t) throw new Error("Conversa não encontrada");
  if (t.user_a !== userId && t.user_b !== userId) {
    throw new Error("Sem acesso a esta conversa");
  }
  return t.user_a === userId ? "a" : "b";
}

export const clearThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ threadId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const side = await getThreadSide(supabase, userId, data.threadId);
    const patch =
      side === "a"
        ? { cleared_at_a: new Date().toISOString() }
        : { cleared_at_b: new Date().toISOString() };
    const { error } = await supabase
      .from("chat_threads")
      .update(patch)
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteThreadForMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ threadId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const side = await getThreadSide(supabase, userId, data.threadId);
    const now = new Date().toISOString();
    const patch =
      side === "a"
        ? { cleared_at_a: now, deleted_at_a: now }
        : { cleared_at_b: now, deleted_at_b: now };
    const { error } = await supabase
      .from("chat_threads")
      .update(patch)
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const reportUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        reason: z.string().trim().min(1).max(80),
        details: z.string().trim().max(2000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.targetUserId === userId) {
      throw new Error("Você não pode denunciar a si mesmo.");
    }
    const { error } = await supabase.from("content_reports").insert({
      reporter_id: userId,
      target_type: "profile",
      target_id: data.targetUserId,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });



// ---- Message-level actions ----

async function assertMessageInThreadOfUser(
  supabase: any,
  userId: string,
  messageId: string,
): Promise<{ id: string; sender_id: string; thread_id: string; created_at: string; content: string; price_cents: number | null; metadata: any }> {
  const { data: m, error } = await supabase
    .from("chat_messages")
    .select("id, sender_id, thread_id, created_at, content, price_cents, metadata")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!m) throw new Error("Mensagem não encontrada");
  const { data: t, error: tErr } = await supabase
    .from("chat_threads")
    .select("user_a, user_b")
    .eq("id", m.thread_id)
    .maybeSingle();
  if (tErr) throw new Error(tErr.message);
  if (!t || (t.user_a !== userId && t.user_b !== userId)) {
    throw new Error("Sem acesso a esta mensagem");
  }
  return m;
}

export const hideMessageForMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ messageId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertMessageInThreadOfUser(supabase, userId, data.messageId);
    const { error } = await supabase
      .from("chat_message_hides")
      .insert({ message_id: data.messageId, user_id: userId });
    if (error && !`${error.message}`.includes("duplicate")) {
      throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteMessageForAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ messageId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const m = await assertMessageInThreadOfUser(supabase, userId, data.messageId);
    if (m.sender_id !== userId) {
      throw new Error("Você só pode apagar suas próprias mensagens");
    }
    const ageMs = Date.now() - new Date(m.created_at).getTime();
    if (ageMs > 15 * 60 * 1000) {
      throw new Error("Só é possível apagar para todos por até 15 minutos");
    }
    const { error } = await supabase
      .from("chat_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.messageId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const forwardMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        messageId: z.string().uuid(),
        toThreadId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const m = await assertMessageInThreadOfUser(supabase, userId, data.messageId);
    await getThreadSide(supabase, userId, data.toThreadId);
    // Do not forward paid/locked media or special cards
    const meta = m.metadata ?? {};
    const forwardMeta: Record<string, unknown> = {};
    if (Array.isArray(meta.media) && meta.media.length > 0 && !meta.paidUpload) {
      forwardMeta.media = meta.media;
    }
    const content = m.content ?? "";
    if (!content.trim() && !forwardMeta.media) {
      throw new Error("Nada para encaminhar nesta mensagem");
    }
    const { error } = await supabase.from("chat_messages").insert({
      thread_id: data.toThreadId,
      sender_id: userId,
      content,
      price_cents: 0,
      metadata: forwardMeta as unknown as never,
    });
    if (error) throw new Error(error.message);
    await supabase
      .from("chat_threads")
      .update({ deleted_at_a: null, deleted_at_b: null })
      .eq("id", data.toThreadId);
    return { ok: true as const };
  });

export const reportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        messageId: z.string().uuid(),
        reason: z.string().trim().min(1).max(80),
        details: z.string().trim().max(2000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const m = await assertMessageInThreadOfUser(supabase, userId, data.messageId);
    if (m.sender_id === userId) {
      throw new Error("Você não pode denunciar sua própria mensagem");
    }
    const { error } = await supabase.from("content_reports").insert({
      reporter_id: userId,
      target_type: "chat_message",
      target_id: data.messageId,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listForwardTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ThreadListItem[]> => {
    // Reuse listThreads shape via direct query to avoid RPC recursion
    const { supabase, userId } = context;
    const { data: threads } = await supabase
      .from("chat_threads")
      .select("id, user_a, user_b, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(50);
    if (!threads || threads.length === 0) return [];
    const partnerIds = Array.from(
      new Set(threads.map((t) => (t.user_a === userId ? t.user_b : t.user_a))),
    );
    const { data: profiles } = await supabase
      .from("profiles_public" as any)
      .select("user_id, username, avatar_url")
      .in("user_id", partnerIds);
    const pmap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    return threads.map((t) => {
      const partnerId = t.user_a === userId ? t.user_b : t.user_a;
      const p = pmap.get(partnerId);
      return {
        threadId: t.id,
        partnerId,
        partnerUsername: p?.username ?? "usuário",
        partnerAvatar: (p as { avatar_url?: string | null } | undefined)?.avatar_url ?? null,
        lastMessage: null,
        lastMessageAt: t.last_message_at ?? new Date().toISOString(),
        unreadCount: 0,
        isMuted: false,
      };
    });
  });
