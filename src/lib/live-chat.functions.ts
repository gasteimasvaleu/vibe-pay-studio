import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type LiveChatMessage = {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  text: string;
  ts: number;
};

const lastSendByUser = new Map<string, number>();
const MIN_INTERVAL_MS = 500;

export const getLiveMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { streamId: string; limit?: number }) =>
    z.object({ streamId: z.string().uuid(), limit: z.number().int().min(1).max(200).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const limit = data.limit ?? 100;
    const { data: rows } = await context.supabase
      .from("live_comments")
      .select("id, user_id, content, created_at")
      .eq("live_id", data.streamId)
      .order("created_at", { ascending: false })
      .limit(limit);

    const list = (rows ?? []).slice().reverse();
    const userIds = Array.from(new Set(list.map((r: any) => r.user_id)));
    let byId = new Map<string, any>();
    if (userIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);
      byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }

    const messages: LiveChatMessage[] = list.map((r: any) => {
      const p = byId.get(r.user_id);
      return {
        id: r.id,
        userId: r.user_id,
        username: p?.username ?? null,
        displayName: p?.display_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
        text: r.content,
        ts: new Date(r.created_at).getTime(),
      };
    });

    return { messages };
  });

export const sendLiveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { streamId: string; text: string }) =>
    z.object({
      streamId: z.string().uuid(),
      text: z.string().trim().min(1).max(500),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const now = Date.now();
    const last = lastSendByUser.get(context.userId) ?? 0;
    if (now - last < MIN_INTERVAL_MS) {
      return { status: "rate_limited" as const };
    }
    lastSendByUser.set(context.userId, now);

    const { data: inserted, error } = await context.supabase
      .from("live_comments")
      .insert({ live_id: data.streamId, user_id: context.userId, content: data.text })
      .select("id, user_id, content, created_at")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "insert_failed");

    const { data: prof } = await context.supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();

    const message: LiveChatMessage = {
      id: (inserted as any).id,
      userId: (inserted as any).user_id,
      username: (prof as any)?.username ?? null,
      displayName: (prof as any)?.display_name ?? null,
      avatarUrl: (prof as any)?.avatar_url ?? null,
      text: (inserted as any).content,
      ts: new Date((inserted as any).created_at).getTime(),
    };

    return { status: "ok" as const, message };
  });
