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
      .select("id, user_id, content, created_at, username, avatar_url")
      .eq("live_id", data.streamId)
      .order("created_at", { ascending: false })
      .limit(limit);

    const list = (rows ?? []).slice().reverse();

    // Fallback: only fetch profiles for rows missing snapshot (legacy).
    const missing = Array.from(
      new Set(list.filter((r: any) => !r.username && !r.avatar_url).map((r: any) => r.user_id)),
    );
    let byId = new Map<string, any>();
    if (missing.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", missing);
      byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }

    const messages: LiveChatMessage[] = list.map((r: any) => {
      const p = byId.get(r.user_id);
      return {
        id: r.id,
        userId: r.user_id,
        username: r.username ?? p?.username ?? null,
        displayName: p?.display_name ?? null,
        avatarUrl: r.avatar_url ?? p?.avatar_url ?? null,
        text: r.content,
        ts: new Date(r.created_at).getTime(),
      };
    });

    return { messages };
  });

export const sendLiveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { streamId: string; text: string }) =>
    z
      .object({
        streamId: z.string().uuid(),
        text: z.string().trim().min(1).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const now = Date.now();
    const last = lastSendByUser.get(context.userId) ?? 0;
    if (now - last < MIN_INTERVAL_MS) {
      return { status: "rate_limited" as const };
    }
    lastSendByUser.set(context.userId, now);

    // Identity snapshot — denormalized into live_comments so history "photographs"
    // the sender's avatar/username at send time and getLiveMessages avoids a JOIN.
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();

    const usernameSnap =
      (prof as any)?.username ?? (prof as any)?.display_name ?? null;
    const avatarSnap = (prof as any)?.avatar_url ?? null;

    const { data: inserted, error } = await context.supabase
      .from("live_comments")
      .insert({
        live_id: data.streamId,
        user_id: context.userId, // from middleware, never from input
        content: data.text,
        username: usernameSnap,
        avatar_url: avatarSnap,
      })
      .select("id, user_id, content, created_at, username, avatar_url")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "insert_failed");

    const message: LiveChatMessage = {
      id: (inserted as any).id,
      userId: (inserted as any).user_id,
      username: (inserted as any).username ?? usernameSnap,
      displayName: (prof as any)?.display_name ?? null,
      avatarUrl: (inserted as any).avatar_url ?? avatarSnap,
      text: (inserted as any).content,
      ts: new Date((inserted as any).created_at).getTime(),
    };

    return { status: "ok" as const, message };
  });
