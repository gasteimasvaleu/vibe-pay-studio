import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProfileIdFor } from "@/lib/profile-active.server";

export type CreatorHubFilter =
  | "all"
  | "sales"
  | "tips"
  | "comments"
  | "feed";

export type CreatorHubNotification = {
  id: string;
  kind: "sale" | "tip" | "comment" | "like";
  title: string;
  subtitle: string | null;
  amountCents: number | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  createdAt: string;
  href: string | null;
};

const TX_SALE_KINDS = [
  "subscription",
  "publication_unlock",
  "chat_unlock",
  "video_call",
  "live_ticket",
  "challenge_contribution",
] as const;

type TxKind =
  | "subscription"
  | "publication_unlock"
  | "chat_unlock"
  | "video_call"
  | "live_ticket"
  | "challenge_contribution"
  | "tip";

async function loadActorMap(
  supabase: any,
  userIds: Array<string | null | undefined>,
): Promise<Map<string, { username: string | null; avatar_url: string | null }>> {
  const uniq = Array.from(new Set(userIds.filter((v): v is string => !!v)));
  if (!uniq.length) return new Map();
  const { data } = await supabase
    .from("profiles_public")
    .select("user_id, username, avatar_url, free_avatar_url, free_username")
    .in("user_id", uniq);
  const map = new Map<string, { username: string | null; avatar_url: string | null }>();
  for (const r of (data ?? []) as any[]) {
    map.set(r.user_id, {
      username: r.username ?? r.free_username ?? null,
      avatar_url: r.avatar_url ?? r.free_avatar_url ?? null,
    });
  }
  return map;
}

export const getCreatorHubNotificationsV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { filter: CreatorHubFilter }) =>
    z.object({ filter: z.enum(["all", "sales", "tips", "comments", "feed"]) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<CreatorHubNotification[]> => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    if (!profileId) return [];

    type Row = { userId: string | null; item: CreatorHubNotification };
    const rows: Row[] = [];

    const filter = data.filter;

    if (filter === "all" || filter === "sales" || filter === "tips") {
      const kinds: TxKind[] =
        filter === "tips"
          ? ["tip"]
          : filter === "sales"
            ? [...TX_SALE_KINDS]
            : ["tip", ...TX_SALE_KINDS];
      const { data: txs } = await supabase
        .from("transactions")
        .select("id, kind, buyer_id, amount_cents_gross, created_at")
        .eq("creator_profile_id", profileId)
        .eq("status", "paid")
        .in("kind", kinds)
        .order("created_at", { ascending: false })
        .limit(50);
      for (const t of (txs ?? []) as any[]) {
        const isTip = t.kind === "tip";
        rows.push({
          userId: t.buyer_id ?? null,
          item: {
            id: `tx-${t.id}`,
            kind: isTip ? "tip" : "sale",
            title: isTip
              ? "Você recebeu um mimo"
              : t.kind === "subscription"
                ? "Nova assinatura"
                : t.kind === "publication_unlock"
                  ? "Nova venda de post"
                  : t.kind === "chat_unlock"
                    ? "Nova venda no chat"
                    : t.kind === "video_call"
                      ? "Nova chamada de vídeo"
                      : t.kind === "live_ticket"
                        ? "Novo ticket de live"
                        : "Nova venda",
            subtitle: null,
            amountCents: Number(t.amount_cents_gross ?? 0),
            actorUsername: null,
            actorAvatarUrl: null,
            createdAt: t.created_at,
            href: null,
          },
        });
      }
    }

    if (filter === "all" || filter === "comments" || filter === "feed") {
      const { data: pubs } = await supabase
        .from("publications")
        .select("id")
        .eq("creator_profile_id", profileId)
        .limit(500);
      const pubIds = ((pubs ?? []) as any[]).map((p) => p.id);

      if (pubIds.length && (filter === "all" || filter === "comments")) {
        const { data: cs } = await supabase
          .from("publication_comments")
          .select("id, publication_id, user_id, body, created_at")
          .in("publication_id", pubIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
        for (const c of (cs ?? []) as any[]) {
          rows.push({
            userId: c.user_id,
            item: {
              id: `cmt-${c.id}`,
              kind: "comment",
              title: "Novo comentário",
              subtitle: (c.body ?? "").slice(0, 140),
              amountCents: null,
              actorUsername: null,
              actorAvatarUrl: null,
              createdAt: c.created_at,
              href: null,
            },
          });
        }
      }

      if (pubIds.length && (filter === "all" || filter === "feed")) {
        const { data: ls } = await supabase
          .from("publication_likes")
          .select("publication_id, user_id, created_at")
          .in("publication_id", pubIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
        for (const l of (ls ?? []) as any[]) {
          rows.push({
            userId: l.user_id,
            item: {
              id: `like-${l.publication_id}-${l.user_id}`,
              kind: "like",
              title: "Curtiu seu post",
              subtitle: null,
              amountCents: null,
              actorUsername: null,
              actorAvatarUrl: null,
              createdAt: l.created_at,
              href: null,
            },
          });
        }
      }
    }

    const actorMap = await loadActorMap(
      supabase,
      rows.map((r) => r.userId),
    );

    rows.sort((a, b) => (a.item.createdAt < b.item.createdAt ? 1 : -1));

    return rows.slice(0, 100).map((r) => {
      const a = r.userId ? actorMap.get(r.userId) : undefined;
      return {
        ...r.item,
        actorUsername: a?.username ?? null,
        actorAvatarUrl: a?.avatar_url ?? null,
      };
    });
  });

// ------------- Destaques -------------

export type CreatorHubHighlights = {
  sales: {
    revenue7dCents: number;
    newSubscribers7d: number;
    topMediaTitle: string | null;
    topMediaSalesCount: number;
  };
  achievements: {
    totalEarnedCents: number;
    milestones: Array<{
      cents: number;
      reached: boolean;
      requested: boolean;
    }>;
  };
  moderation: {
    count: number;
    items: Array<{ id: string; caption: string | null; status: string; created_at: string }>;
  };
};

const MILESTONES = [10_000_000, 50_000_000, 100_000_000]; // R$ 100k / 500k / 1M

export const getCreatorHubHighlights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreatorHubHighlights> => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    if (!profileId) {
      return {
        sales: {
          revenue7dCents: 0,
          newSubscribers7d: 0,
          topMediaTitle: null,
          topMediaSalesCount: 0,
        },
        achievements: {
          totalEarnedCents: 0,
          milestones: MILESTONES.map((c) => ({ cents: c, reached: false, requested: false })),
        },
        moderation: { count: 0, items: [] },
      };
    }

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceIso = since.toISOString();

    const [tx7d, newSubs, topMedia, totalTx, moderation, trophies] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount_cents_gross")
        .eq("creator_profile_id", profileId)
        .eq("status", "paid")
        .gte("created_at", sinceIso),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("creator_profile_id", profileId)
        .gte("created_at", sinceIso),
      supabase
        .from("transactions")
        .select("reference_id")
        .eq("creator_profile_id", profileId)
        .eq("status", "paid")
        .eq("kind", "publication_unlock")
        .gte("created_at", sinceIso),
      supabase
        .from("transactions")
        .select("net_cents")
        .eq("creator_profile_id", profileId)
        .eq("status", "paid"),
      supabase
        .from("publications")
        .select("id, caption, moderation_status, created_at")
        .eq("creator_profile_id", profileId)
        .in("moderation_status", ["hidden", "removed", "pending"])
        .order("created_at", { ascending: false })
        .limit(10),
      (supabase as any)
        .from("trophy_requests")
        .select("milestone_cents")
        .eq("user_id", userId),
    ]);

    const revenue7d = ((tx7d.data ?? []) as any[]).reduce(
      (acc: number, r: any) => acc + Number(r.amount_cents_gross ?? 0),
      0,
    );
    const totalEarned = ((totalTx.data ?? []) as any[]).reduce(
      (acc: number, r: any) => acc + Number(r.net_cents ?? 0),
      0,
    );

    // Top mídia
    const salesByPub = new Map<string, number>();
    for (const t of ((topMedia.data ?? []) as any[])) {
      if (!t.reference_id) continue;
      salesByPub.set(t.reference_id, (salesByPub.get(t.reference_id) ?? 0) + 1);
    }
    let topPubId: string | null = null;
    let topCount = 0;
    for (const [k, v] of salesByPub) {
      if (v > topCount) {
        topCount = v;
        topPubId = k;
      }
    }
    let topMediaTitle: string | null = null;
    if (topPubId) {
      const { data: p } = await supabase
        .from("publications")
        .select("caption")
        .eq("id", topPubId)
        .maybeSingle();
      topMediaTitle = (p as any)?.caption ?? "Post sem legenda";
    }

    const requestedSet = new Set<number>(
      (((trophies as any).data ?? []) as any[]).map((r) => Number(r.milestone_cents)),
    );

    return {
      sales: {
        revenue7dCents: revenue7d,
        newSubscribers7d: (newSubs as any).count ?? 0,
        topMediaTitle,
        topMediaSalesCount: topCount,
      },
      achievements: {
        totalEarnedCents: totalEarned,
        milestones: MILESTONES.map((c) => ({
          cents: c,
          reached: totalEarned >= c,
          requested: requestedSet.has(c),
        })),
      },
      moderation: {
        count: ((moderation.data ?? []) as any[]).length,
        items: ((moderation.data ?? []) as any[]).map((m) => ({
          id: m.id,
          caption: m.caption,
          status: m.moderation_status,
          created_at: m.created_at,
        })),
      },
    };
  });

export const requestTrophy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { milestoneCents: number }) =>
    z.object({ milestoneCents: z.number().int().positive() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profileId = await getActiveProfileIdFor(supabase, userId);
    const { error } = await (supabase as any)
      .from("trophy_requests")
      .insert({
        user_id: userId,
        creator_profile_id: profileId,
        milestone_cents: data.milestoneCents,
      });
    if (error && !/duplicate|unique/i.test(error.message)) {
      throw new Error(error.message);
    }
    return { ok: true };
  });
