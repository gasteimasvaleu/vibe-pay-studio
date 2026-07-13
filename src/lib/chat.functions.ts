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
        .select("id, thread_id, sender_id, content, read_at, created_at")
        .eq("thread_id", data.threadId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (mErr) throw new Error(mErr.message);

      return {
        partner: {
          userId: partnerId,
          username: profile?.username ?? "usuário",
          avatarUrl: null,
        },
        messages: (msgs ?? []).map((m) => ({
          id: m.id,
          threadId: m.thread_id,
          senderId: m.sender_id,
          content: m.content,
          readAt: m.read_at,
          createdAt: m.created_at,
        })),
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
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<ChatMessage> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: data.threadId,
        sender_id: userId,
        content: data.content,
      })
      .select("id, thread_id, sender_id, content, read_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: row.id,
      threadId: row.thread_id,
      senderId: row.sender_id,
      content: row.content,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
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
