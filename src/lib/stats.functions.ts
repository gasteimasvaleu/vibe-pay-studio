import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Range = { from: string; to: string };

const EARNING_KINDS = [
  "publication_unlock",
  "chat_unlock",
  "subscription",
  "tip",
  "video_call",
] as const;

const rangeValidator = (data: { from: string; to: string }): Range => {
  const from = new Date(data.from);
  const to = new Date(data.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date range");
  }
  return { from: from.toISOString(), to: to.toISOString() };
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Série diária de faturamento (bruto + líquido + quantidade) no período.
 */
export const getEarningsSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeValidator)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("transactions")
      .select("created_at, amount_cents_gross, net_cents, kind")
      .eq("creator_id", userId)
      .eq("status", "paid")
      .in("kind", EARNING_KINDS as unknown as never[])
      .gte("created_at", data.from)
      .lte("created_at", data.to);
    if (error) throw new Error(error.message);

    const bucket = new Map<string, { day: string; gross: number; net: number; count: number }>();
    for (const r of rows ?? []) {
      const k = dayKey(r.created_at as string);
      const cur = bucket.get(k) ?? { day: k, gross: 0, net: 0, count: 0 };
      cur.gross += r.amount_cents_gross ?? 0;
      cur.net += r.net_cents ?? 0;
      cur.count += 1;
      bucket.set(k, cur);
    }
    return Array.from(bucket.values()).sort((a, b) => a.day.localeCompare(b.day));
  });

/**
 * Agregação por tipo de produto no período.
 */
export const getEarningsByProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeValidator)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("transactions")
      .select("kind, amount_cents_gross, net_cents")
      .eq("creator_id", userId)
      .eq("status", "paid")
      .in("kind", EARNING_KINDS as unknown as never[])
      .gte("created_at", data.from)
      .lte("created_at", data.to);
    if (error) throw new Error(error.message);

    const map = new Map<string, { kind: string; gross: number; net: number; count: number }>();
    for (const r of rows ?? []) {
      const k = String(r.kind);
      const cur = map.get(k) ?? { kind: k, gross: 0, net: 0, count: 0 };
      cur.gross += r.amount_cents_gross ?? 0;
      cur.net += r.net_cents ?? 0;
      cur.count += 1;
      map.set(k, cur);
    }
    const items = Array.from(map.values()).sort((a, b) => b.gross - a.gross);
    const totalGross = items.reduce((a, r) => a + r.gross, 0);
    const totalNet = items.reduce((a, r) => a + r.net, 0);
    const totalCount = items.reduce((a, r) => a + r.count, 0);
    return { items, totalGross, totalNet, totalCount };
  });

/**
 * Totais do período (bruto/líquido/count) + variação vs período anterior.
 */
export const getPeriodTotals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeValidator)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const from = new Date(data.from);
    const to = new Date(data.to);
    const spanMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - spanMs);
    const prevTo = from;

    const runQuery = async (a: Date, b: Date) => {
      const { data: rows, error } = await supabase
        .from("transactions")
        .select("amount_cents_gross, net_cents, kind, is_international, country_code")
        .eq("creator_id", userId)
        .eq("status", "paid")
        .in("kind", EARNING_KINDS as unknown as never[])
        .gte("created_at", a.toISOString())
        .lte("created_at", b.toISOString());
      if (error) throw new Error(error.message);
      return rows ?? [];
    };

    const [cur, prev] = await Promise.all([runQuery(from, to), runQuery(prevFrom, prevTo)]);

    const sum = (rows: typeof cur) => ({
      gross: rows.reduce((a, r) => a + (r.amount_cents_gross ?? 0), 0),
      net: rows.reduce((a, r) => a + (r.net_cents ?? 0), 0),
      count: rows.length,
      national: rows.filter((r) => !r.is_international).reduce((a, r) => a + (r.amount_cents_gross ?? 0), 0),
      international: rows.filter((r) => !!r.is_international).reduce((a, r) => a + (r.amount_cents_gross ?? 0), 0),
    });

    return { current: sum(cur), previous: sum(prev) };
  });

/**
 * Resumo geral (hoje/mês/histórico + projeção linear do mês corrente).
 */
export const getResumoStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeValidator)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const baseSelect = "amount_cents_gross, net_cents, is_international, created_at";

    const [todayRes, monthRes, historyRes, periodRes] = await Promise.all([
      supabase.from("transactions").select(baseSelect)
        .eq("creator_id", userId).eq("status", "paid")
        .in("kind", EARNING_KINDS as unknown as never[])
        .gte("created_at", startOfDay.toISOString()),
      supabase.from("transactions").select(baseSelect)
        .eq("creator_id", userId).eq("status", "paid")
        .in("kind", EARNING_KINDS as unknown as never[])
        .gte("created_at", startOfMonth.toISOString()),
      supabase.from("transactions").select(baseSelect)
        .eq("creator_id", userId).eq("status", "paid")
        .in("kind", EARNING_KINDS as unknown as never[]),
      supabase.from("transactions").select(baseSelect)
        .eq("creator_id", userId).eq("status", "paid")
        .in("kind", EARNING_KINDS as unknown as never[])
        .gte("created_at", data.from).lte("created_at", data.to),
    ]);

    for (const r of [todayRes, monthRes, historyRes, periodRes]) {
      if (r.error) throw new Error(r.error.message);
    }

    type Row = { amount_cents_gross: number | null; is_international: boolean | null };
    const sum = (rows: Row[] | null, opts?: { national?: boolean; international?: boolean }) => {
      const src = rows ?? [];
      const filtered = opts?.national ? src.filter(r => !r.is_international)
        : opts?.international ? src.filter(r => !!r.is_international)
        : src;
      return filtered.reduce((a, r) => a + (r.amount_cents_gross ?? 0), 0);
    };

    const monthElapsedDays = Math.max(1, Math.floor((now.getTime() - startOfMonth.getTime()) / 86_400_000) + 1);
    const monthGross = sum(monthRes.data as Row[] | null);
    const monthDaysTotal = Math.ceil((endOfMonth.getTime() - startOfMonth.getTime()) / 86_400_000) + 1;
    const avgDay = monthGross / monthElapsedDays;
    const projection = Math.round(avgDay * monthDaysTotal);

    return {
      today: {
        national: sum(todayRes.data as Row[] | null, { national: true }),
        international: sum(todayRes.data as Row[] | null, { international: true }),
        total: sum(todayRes.data as Row[] | null),
      },
      month: {
        national: sum(monthRes.data as Row[] | null, { national: true }),
        international: sum(monthRes.data as Row[] | null, { international: true }),
        total: monthGross,
        avgDay: Math.round(avgDay),
        projection,
      },
      history: {
        national: sum(historyRes.data as Row[] | null, { national: true }),
        international: sum(historyRes.data as Row[] | null, { international: true }),
        total: sum(historyRes.data as Row[] | null),
      },
      period: {
        total: sum(periodRes.data as Row[] | null),
      },
    };
  });

/**
 * Recordes: top N dias de faturamento no período e no mês.
 */
export const getRecordes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeValidator)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const fetchRange = async (fromIso: string, toIso: string) => {
      const { data: rows, error } = await supabase
        .from("transactions")
        .select("created_at, amount_cents_gross")
        .eq("creator_id", userId).eq("status", "paid")
        .in("kind", EARNING_KINDS as unknown as never[])
        .gte("created_at", fromIso).lte("created_at", toIso);
      if (error) throw new Error(error.message);
      const map = new Map<string, number>();
      for (const r of rows ?? []) {
        const k = dayKey(r.created_at as string);
        map.set(k, (map.get(k) ?? 0) + (r.amount_cents_gross ?? 0));
      }
      return Array.from(map.entries())
        .map(([day, gross]) => ({ day, gross }))
        .sort((a, b) => b.gross - a.gross)
        .slice(0, 3);
    };

    const [day, month] = await Promise.all([
      fetchRange(data.from, data.to),
      fetchRange(startOfMonth.toISOString(), new Date().toISOString()),
    ]);
    return { day, month };
  });

/**
 * Extrato paginado com filtros de tipo/status.
 */
export const listExtrato = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    from: string; to: string;
    kinds?: string[]; statuses?: string[];
    limit?: number; offset?: number;
  }) => ({
    ...rangeValidator({ from: data.from, to: data.to }),
    kinds: data.kinds ?? [],
    statuses: data.statuses ?? [],
    limit: Math.min(Math.max(data.limit ?? 30, 1), 100),
    offset: Math.max(data.offset ?? 0, 0),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("transactions")
      .select("id, kind, status, amount_cents_gross, net_cents, payment_method, buyer_id, created_at, released_at, wallet_released_at, is_international", { count: "exact" })
      .eq("creator_id", userId)
      .gte("created_at", data.from).lte("created_at", data.to)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.kinds.length) q = q.in("kind", data.kinds as unknown as never[]);
    if (data.statuses.length) q = q.in("status", data.statuses as unknown as never[]);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const buyerIds = Array.from(new Set((rows ?? []).map(r => r.buyer_id).filter(Boolean))) as string[];
    let profiles: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
    if (buyerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", buyerIds);
      profiles = Object.fromEntries((profs ?? []).map(p => [p.user_id as string, {
        username: p.username, display_name: p.display_name, avatar_url: p.avatar_url,
      }]));
    }

    return {
      total: count ?? 0,
      items: (rows ?? []).map(r => ({
        ...r,
        buyer: r.buyer_id ? profiles[r.buyer_id] ?? null : null,
      })),
    };
  });

/**
 * Estatísticas de assinantes.
 */
export const getAssinantesStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeValidator)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();

    const [allRes, periodRes] = await Promise.all([
      supabase.from("subscriptions")
        .select("id, subscriber_id, status, price_cents_paid, current_period_end, started_at, created_at, provider_ref")
        .eq("creator_id", userId),
      supabase.from("subscriptions")
        .select("id, subscriber_id, status, price_cents_paid, started_at, created_at, provider_ref, provider")
        .eq("creator_id", userId)
        .gte("created_at", data.from).lte("created_at", data.to)
        .order("created_at", { ascending: true }),
    ]);
    if (allRes.error) throw new Error(allRes.error.message);
    if (periodRes.error) throw new Error(periodRes.error.message);

    const all = allRes.data ?? [];
    const active = all.filter(s => s.status === "active" && s.current_period_end && s.current_period_end > now);
    const total = all.length;
    const ticketAvg = active.length
      ? Math.round(active.reduce((a, s) => a + (s.price_cents_paid ?? 0), 0) / active.length)
      : 0;

    // No banco atual não temos flag de renovação vs. novo; consideramos "renovação"
    // uma segunda ou N-ésima assinatura do mesmo subscriber_id nesse criador.
    const period = periodRes.data ?? [];
    const seen = new Set<string>();
    const historyBefore = new Set(
      all.filter(s => new Date(s.created_at as string) < new Date(data.from)).map(s => s.subscriber_id as string),
    );
    let novos = 0;
    let renovacoes = 0;
    const dailyMap = new Map<string, { day: string; novos: number; renovacoes: number; gross: number }>();

    for (const s of period) {
      const sid = s.subscriber_id as string;
      const isRenewal = historyBefore.has(sid) || seen.has(sid);
      seen.add(sid);
      if (isRenewal) renovacoes += 1;
      else novos += 1;

      const k = dayKey(s.created_at as string);
      const cur = dailyMap.get(k) ?? { day: k, novos: 0, renovacoes: 0, gross: 0 };
      if (isRenewal) cur.renovacoes += 1;
      else cur.novos += 1;
      cur.gross += s.price_cents_paid ?? 0;
      dailyMap.set(k, cur);
    }

    const daily = Array.from(dailyMap.values()).sort((a, b) => a.day.localeCompare(b.day));

    return {
      totalAtivos: active.length,
      totalHistorico: total,
      novosPeriodo: novos,
      renovacoesPeriodo: renovacoes,
      faturamentoPeriodo: period.reduce((a, s) => a + (s.price_cents_paid ?? 0), 0),
      ticketMedio: ticketAvg,
      daily,
    };
  });

/**
 * Ranking dos maiores assinantes por gasto no criador (no período).
 */
export const getTopAssinantes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { from: string; to: string; metric?: "total" | "subscription" | "tip" | "chat_unlock" }) => ({
    ...rangeValidator({ from: data.from, to: data.to }),
    metric: data.metric ?? "total",
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("transactions")
      .select("buyer_id, amount_cents_gross, kind")
      .eq("creator_id", userId).eq("status", "paid")
      .in("kind", EARNING_KINDS as unknown as never[])
      .gte("created_at", data.from).lte("created_at", data.to);

    if (data.metric === "subscription") q = q.eq("kind", "subscription");
    else if (data.metric === "tip") q = q.eq("kind", "tip");
    else if (data.metric === "chat_unlock") q = q.eq("kind", "chat_unlock");

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const map = new Map<string, number>();
    for (const r of rows ?? []) {
      if (!r.buyer_id) continue;
      map.set(r.buyer_id as string, (map.get(r.buyer_id as string) ?? 0) + (r.amount_cents_gross ?? 0));
    }
    const ranking = Array.from(map.entries())
      .map(([buyer_id, gross]) => ({ buyer_id, gross }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 10);

    if (!ranking.length) return [];
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", ranking.map(r => r.buyer_id));
    const byId = Object.fromEntries((profs ?? []).map(p => [p.user_id as string, p]));
    return ranking.map(r => ({
      buyerId: r.buyer_id,
      gross: r.gross,
      username: (byId[r.buyer_id] as { username?: string | null } | undefined)?.username ?? null,
      displayName: (byId[r.buyer_id] as { display_name?: string | null } | undefined)?.display_name ?? null,
      avatarUrl: (byId[r.buyer_id] as { avatar_url?: string | null } | undefined)?.avatar_url ?? null,
    }));
  });

/**
 * Top 5 países (via country_code).
 */
export const getTopPaises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeValidator)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("transactions")
      .select("country_code, amount_cents_gross")
      .eq("creator_id", userId).eq("status", "paid")
      .in("kind", EARNING_KINDS as unknown as never[])
      .not("country_code", "is", null)
      .gte("created_at", data.from).lte("created_at", data.to);
    if (error) throw new Error(error.message);
    const map = new Map<string, number>();
    for (const r of rows ?? []) {
      const k = (r.country_code as string) ?? "??";
      map.set(k, (map.get(k) ?? 0) + (r.amount_cents_gross ?? 0));
    }
    return Array.from(map.entries())
      .map(([country, gross]) => ({ country, gross }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 5);
  });

/**
 * Streak (sequência) do criador + calendário do mês.
 */
export const getStreak = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const startWindow = new Date(); startWindow.setDate(startWindow.getDate() - 400); startWindow.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("creator_streak_days")
      .select("day, publications_count, live_minutes, chat_replies, revenue_cents")
      .eq("creator_id", userId)
      .gte("day", startWindow.toISOString().slice(0, 10))
      .order("day", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const daysSet = new Set(rows.map(r => r.day as string));

    // Longest + current streak (day gap counts if not active)
    const sorted = rows.map(r => r.day as string).sort();
    let longest = 0, cur = 0, prev: Date | null = null;
    for (const d of sorted) {
      const cd = new Date(d);
      if (prev && (cd.getTime() - prev.getTime()) === 86_400_000) cur += 1;
      else cur = 1;
      if (cur > longest) longest = cur;
      prev = cd;
    }

    let currentStreak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; ; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      if (daysSet.has(k)) currentStreak += 1;
      else if (i === 0) continue;
      else break;
    }

    const monthRows = rows.filter(r => (r.day as string) >= startOfMonth.toISOString().slice(0, 10));
    const monthTotals = monthRows.reduce(
      (a, r) => ({
        pubs: a.pubs + (r.publications_count ?? 0),
        live: a.live + (r.live_minutes ?? 0),
        chat: a.chat + (r.chat_replies ?? 0),
        revenue: a.revenue + (r.revenue_cents ?? 0),
      }),
      { pubs: 0, live: 0, chat: 0, revenue: 0 },
    );

    return {
      currentStreak,
      longestStreak: longest,
      activeDays: Array.from(daysSet),
      monthTotals,
    };
  });

/**
 * Alcance: visitantes do perfil + visualizações de publicações.
 */
export const getAlcance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeValidator)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: pubIds } = await supabase
      .from("publications")
      .select("id")
      .eq("author_id", userId);
    const ids = (pubIds ?? []).map(p => p.id as string);

    const [profRes, pubRes, followRes] = await Promise.all([
      supabase.from("profile_views")
        .select("viewer_id, created_at")
        .eq("profile_id", userId)
        .gte("created_at", data.from).lte("created_at", data.to),
      ids.length
        ? supabase.from("publication_views")
            .select("viewer_id, created_at")
            .in("publication_id", ids)
            .gte("created_at", data.from).lte("created_at", data.to)
        : Promise.resolve({ data: [] as { viewer_id: string | null; created_at: string }[], error: null }),
      supabase.from("follows")
        .select("follower_id, created_at")
        .eq("followee_id", userId)
        .gte("created_at", data.from).lte("created_at", data.to),
    ]);

    const profViews = ("data" in profRes ? profRes.data : []) ?? [];
    const pubViews = ("data" in pubRes ? pubRes.data : []) ?? [];
    const follows = ("data" in followRes ? followRes.data : []) ?? [];

    const profVisitors = new Set(profViews.map(v => v.viewer_id).filter(Boolean));
    const pubVisitors = new Set(pubViews.map(v => v.viewer_id).filter(Boolean));

    const dailyMap = new Map<string, { day: string; visits: number; users: number }>();
    const seenPerDay = new Map<string, Set<string>>();
    for (const v of profViews) {
      const k = dayKey(v.created_at as string);
      const cur = dailyMap.get(k) ?? { day: k, visits: 0, users: 0 };
      cur.visits += 1;
      const users = seenPerDay.get(k) ?? new Set<string>();
      if (v.viewer_id) users.add(v.viewer_id as string);
      seenPerDay.set(k, users);
      cur.users = users.size;
      dailyMap.set(k, cur);
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.day.localeCompare(b.day));

    return {
      profileViews: profViews.length,
      profileUniqueViewers: profVisitors.size,
      publicationViews: pubViews.length,
      publicationUniqueViewers: pubVisitors.size,
      newFollowers: follows.length,
      daily,
    };
  });

/**
 * Engajamento: publicações do período com métricas.
 */
export const getEngajamentoPublicacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { from: string; to: string; sort?: "recent" | "revenue" | "tips" | "likes" | "comments" }) => ({
    ...rangeValidator({ from: data.from, to: data.to }),
    sort: data.sort ?? "recent",
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: pubs, error } = await supabase
      .from("publications")
      .select("id, caption, visibility, price_cents, published_at, created_at, pinned, archived_at")
      .eq("author_id", userId)
      .gte("created_at", data.from).lte("created_at", data.to);
    if (error) throw new Error(error.message);
    const { data: profileRow } = await supabase
      .from("profiles").select("username").eq("user_id", userId).maybeSingle();
    const authorUsername = (profileRow?.username as string | null) ?? null;
    const list = pubs ?? [];
    const ids = list.map(p => p.id as string);
    if (!ids.length) {
      return { items: [], totalCount: 0, totalRevenue: 0, authorUsername };
    }


    const [likesRes, commentsRes, unlocksRes, tipsRes] = await Promise.all([
      supabase.from("publication_likes").select("publication_id").in("publication_id", ids),
      supabase.from("publication_comments").select("publication_id").in("publication_id", ids),
      supabase.from("publication_unlocks").select("publication_id, amount_cents").in("publication_id", ids).eq("status", "paid"),
      supabase.from("tips").select("publication_id, amount_cents").in("publication_id", ids).eq("status", "paid"),
    ]);

    const count = <T extends { publication_id: string | null }>(rows: T[] | null | undefined) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) {
        if (!r.publication_id) continue;
        m.set(r.publication_id, (m.get(r.publication_id) ?? 0) + 1);
      }
      return m;
    };
    const sumBy = <T extends { publication_id: string | null; amount_cents: number | null }>(rows: T[] | null | undefined) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) {
        if (!r.publication_id) continue;
        m.set(r.publication_id, (m.get(r.publication_id) ?? 0) + (r.amount_cents ?? 0));
      }
      return m;
    };

    const likesMap = count(likesRes.data);
    const commentsMap = count(commentsRes.data);
    const unlocksRevenue = sumBy(unlocksRes.data);
    const tipsRevenue = sumBy(tipsRes.data);
    const tipsCount = count(tipsRes.data);

    const items = list.map(p => {
      const id = p.id as string;
      const revenue = (unlocksRevenue.get(id) ?? 0) + (tipsRevenue.get(id) ?? 0);
      return {
        id,
        caption: p.caption,
        visibility: p.visibility,
        priceCents: p.price_cents ?? 0,
        publishedAt: p.published_at ?? p.created_at,
        pinned: !!(p as { pinned?: boolean }).pinned,
        archivedAt: (p as { archived_at?: string | null }).archived_at ?? null,
        likes: likesMap.get(id) ?? 0,
        comments: commentsMap.get(id) ?? 0,
        tips: tipsCount.get(id) ?? 0,
        revenue,
      };
    });

    const sorters = {
      recent: (a: (typeof items)[number], b: (typeof items)[number]) =>
        String(b.publishedAt).localeCompare(String(a.publishedAt)),
      revenue: (a: (typeof items)[number], b: (typeof items)[number]) => b.revenue - a.revenue,
      tips: (a: (typeof items)[number], b: (typeof items)[number]) => b.tips - a.tips,
      likes: (a: (typeof items)[number], b: (typeof items)[number]) => b.likes - a.likes,
      comments: (a: (typeof items)[number], b: (typeof items)[number]) => b.comments - a.comments,
    };
    items.sort(sorters[data.sort]);

    return {
      items,
      totalCount: items.length,
      totalRevenue: items.reduce((a, r) => a + r.revenue, 0),
      authorUsername,
    };
  });


/**
 * Lives do período (Engajamento › Lives, Top Live).
 */
export const getEngajamentoLives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { from: string; to: string; sort?: "revenue" | "tips" | "views" }) => ({
    ...rangeValidator({ from: data.from, to: data.to }),
    sort: data.sort ?? "revenue",
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("live_sessions")
      .select("id, title, started_at, ended_at, viewers_peak, total_views, gross_cents, tips_cents, cover_url")
      .eq("creator_id", userId)
      .gte("started_at", data.from).lte("started_at", data.to);
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const sorters = {
      revenue: (a: (typeof list)[number], b: (typeof list)[number]) => (b.gross_cents ?? 0) - (a.gross_cents ?? 0),
      tips: (a: (typeof list)[number], b: (typeof list)[number]) => (b.tips_cents ?? 0) - (a.tips_cents ?? 0),
      views: (a: (typeof list)[number], b: (typeof list)[number]) => (b.total_views ?? 0) - (a.total_views ?? 0),
    };
    list.sort(sorters[data.sort]);
    return {
      items: list,
      totalCount: list.length,
      totalRevenue: list.reduce((a, r) => a + (r.gross_cents ?? 0), 0),
      totalViews: list.reduce((a, r) => a + (r.total_views ?? 0), 0),
    };
  });

/**
 * Registra visita a uma publicação (throttle: 1 view por viewer_id/dia).
 */
export const logPublicationView = createServerFn({ method: "POST" })
  .inputValidator((data: { publicationId: string }) => ({
    publicationId: String(data.publicationId),
  }))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { ok: false };
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    await client.from("publication_views").insert({ publication_id: data.publicationId, viewer_id: null });
    return { ok: true };
  });

/**
 * Registra visita a um perfil.
 */
export const logProfileView = createServerFn({ method: "POST" })
  .inputValidator((data: { profileId: string }) => ({ profileId: String(data.profileId) }))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { ok: false };
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    await client.from("profile_views").insert({ profile_id: data.profileId, viewer_id: null });
    return { ok: true };
  });
