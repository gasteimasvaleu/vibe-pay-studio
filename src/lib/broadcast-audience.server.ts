import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const BROADCAST_AUDIENCES = [
  "all_followers",
  "all_following",
  "active_subscribers",
  "expired_subscribers",
  "expiring_7d",
  "recent_interactors",
  "top_buyers",
] as const;

export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

function nowIso() {
  return new Date().toISOString();
}

export async function resolveAudienceIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  audience: BroadcastAudience,
  topN?: number,
): Promise<string[]> {
  if (audience === "active_subscribers") {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("subscriber_id")
      .eq("creator_id", userId)
      .eq("status", "active")
      .gt("current_period_end", nowIso())
      .limit(1000);
    return Array.from(new Set((subs ?? []).map((s) => s.subscriber_id)));
  }

  if (audience === "expired_subscribers") {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("subscriber_id, current_period_end")
      .eq("creator_id", userId)
      .or(`current_period_end.lt.${nowIso()},status.eq.cancelled`)
      .limit(1000);
    return Array.from(new Set((subs ?? []).map((s) => s.subscriber_id)));
  }

  if (audience === "expiring_7d") {
    const in7d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("subscriber_id")
      .eq("creator_id", userId)
      .eq("status", "active")
      .lte("current_period_end", in7d)
      .gt("current_period_end", nowIso())
      .limit(1000);
    return Array.from(new Set((subs ?? []).map((s) => s.subscriber_id)));
  }

  if (audience === "recent_interactors") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: chatUsers }, { data: liveSessions }] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("sender_id, thread_id")
        .eq("sender_id", userId)
        .gte("created_at", since)
        .limit(1000),
      supabase
        .from("live_sessions")
        .select("id")
        .eq("creator_id", userId)
        .gte("created_at", since)
        .limit(500),
    ]);
    const ids = new Set<string>();
    for (const m of chatUsers ?? []) {
      if (m.sender_id !== userId) ids.add(m.sender_id);
    }
    const liveIds = (liveSessions ?? []).map((s) => s.id).filter(Boolean);
    if (liveIds.length > 0) {
      const { data: comments } = await supabase
        .from("live_comments")
        .select("user_id")
        .in("live_id", liveIds)
        .gte("created_at", since)
        .limit(1000);
      for (const u of comments ?? []) ids.add(u.user_id);
    }
    return Array.from(ids);
  }



  if (audience === "top_buyers") {
    const { data: txs } = await supabase
      .from("transactions")
      .select("buyer_id, amount_cents_gross")
      .eq("creator_id", userId)
      .eq("status", "paid")
      .in("kind", ["publication_unlock", "chat_unlock", "subscription", "tip", "video_call"])
      .limit(2000);
    const grossByBuyer = new Map<string, number>();
    for (const t of txs ?? []) {
      if (!t.buyer_id) continue;
      grossByBuyer.set(t.buyer_id, (grossByBuyer.get(t.buyer_id) ?? 0) + (t.amount_cents_gross ?? 0));
    }
    return Array.from(grossByBuyer.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN ?? 100)
      .map(([id]) => id);
  }

  if (audience === "all_following") {
    const { data: rows, error } = await supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", userId)
      .limit(1000);
    if (error) throw new Error(error.message);
    return Array.from(new Set((rows ?? []).map((r) => r.followee_id)));
  }

  const { data: rows, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("followee_id", userId)
    .limit(1000);
  if (error) throw new Error(error.message);
  return Array.from(new Set((rows ?? []).map((r) => r.follower_id)));
}
