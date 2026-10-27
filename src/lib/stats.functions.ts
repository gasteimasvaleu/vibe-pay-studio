import { createServerFn } from "@tanstack/react-start";
import { signField } from "@/lib/media-sign.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProfileIdFor } from "@/lib/profile-active.server";

type Range = { from: string; to: string };

const EARNING_KINDS = [
  "publication_unlock",
  "chat_unlock",
  "subscription",
  "tip",
  "video_call",
  "live_ticket",
  "challenge_contribution",
  "story_unlock",
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
  .inputValidator((data: { from: string; to: string; kind?: string | null }) => {
    const base = rangeValidator({ from: data.from, to: data.to });
    const kind = data.kind && (EARNING_KINDS as readonly string[]).includes(data.kind) ? data.kind : null;
    return { ...base, kind };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    let q = supabase
      .from("transactions")
      .select("created_at, amount_cents_gross, net_cents, kind")
      .eq("creator_profile_id", profileId)
      .eq("status", "paid")
      .gte("created_at", data.from)
      .lte("created_at", data.to);
    q = data.kind
      ? q.eq("kind", data.kind as any)
      : q.in("kind", EARNING_KINDS as unknown as never[]);
    const { data: rows, error } = await q;
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
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const { data: rows, error } = await supabase
      .from("transactions")
      .select("kind, amount_cents_gross, net_cents")
      .eq("creator_profile_id", profileId)
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
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const from = new Date(data.from);
    const to = new Date(data.to);
    const spanMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - spanMs);
    const prevTo = from;

    const runQuery = async (a: Date, b: Date) => {
      const { data: rows, error } = await supabase
        .from("transactions")
        .select("amount_cents_gross, net_cents, kind, is_international, country_code")
        .eq("creator_profile_id", profileId)
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
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const baseSelect = "amount_cents_gross, net_cents, is_international, created_at";

    const [todayRes, monthRes, historyRes, periodRes] = await Promise.all([
      supabase.from("transactions").select(baseSelect)
        .eq("creator_profile_id", profileId).eq("status", "paid")
        .in("kind", EARNING_KINDS as unknown as never[])
        .gte("created_at", startOfDay.toISOString()),
      supabase.from("transactions").select(baseSelect)
        .eq("creator_profile_id", profileId).eq("status", "paid")
        .in("kind", EARNING_KINDS as unknown as never[])
        .gte("created_at", startOfMonth.toISOString()),
      supabase.from("transactions").select(baseSelect)
        .eq("creator_profile_id", profileId).eq("status", "paid")
        .in("kind", EARNING_KINDS as unknown as never[]),
      supabase.from("transactions").select(baseSelect)
        .eq("creator_profile_id", profileId).eq("status", "paid")
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
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const fetchRange = async (fromIso: string, toIso: string) => {
      const { data: rows, error } = await supabase
        .from("transactions")
        .select("created_at, amount_cents_gross")
        .eq("creator_profile_id", profileId).eq("status", "paid")
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
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    let q = supabase
      .from("transactions")
      .select("id, kind, status, amount_cents_gross, net_cents, payment_method, buyer_id, created_at, released_at, wallet_released_at, is_international", { count: "exact" })
      .eq("creator_profile_id", profileId)
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
        .from("profiles_public")
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
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const now = new Date().toISOString();

    const [allRes, periodRes] = await Promise.all([
      supabase.from("subscriptions")
        .select("id, subscriber_id, status, price_cents_paid, current_period_end, started_at, created_at, provider_ref")
        .eq("creator_profile_id", profileId),
      supabase.from("subscriptions")
        .select("id, subscriber_id, status, price_cents_paid, started_at, created_at, provider_ref, provider")
        .eq("creator_profile_id", profileId)
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

    // Ignora intents PIX abandonados (status pending) — só conta assinaturas efetivamente pagas.
    const PAID_STATUSES = new Set(["active", "canceled", "expired"]);
    const period = (periodRes.data ?? []).filter(s => PAID_STATUSES.has(s.status as string));
    const uniqueSubsInPeriod = new Set<string>();
    const seen = new Set<string>();
    const historyBefore = new Set(
      all
        .filter(s => PAID_STATUSES.has(s.status as string) && new Date(s.created_at as string) < new Date(data.from))
        .map(s => s.subscriber_id as string),
    );
    let novos = 0;
    let renovacoes = 0;
    const dailyMap = new Map<string, { day: string; novos: number; renovacoes: number; gross: number }>();

    for (const s of period) {
      const sid = s.subscriber_id as string;
      uniqueSubsInPeriod.add(sid);
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
      assinantesUnicosPeriodo: uniqueSubsInPeriod.size,
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
  .inputValidator((data: {
    from: string;
    to: string;
    metric?: "total" | "subscription" | "tip" | "chat_unlock" | "publication_unlock" | "story_unlock" | "video_call" | "live_ticket";
  }) => ({
    ...rangeValidator({ from: data.from, to: data.to }),
    metric: data.metric ?? "total",
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    let q = supabase
      .from("transactions")
      .select("buyer_id, amount_cents_gross, kind")
      .eq("creator_profile_id", profileId).eq("status", "paid")
      .in("kind", EARNING_KINDS as unknown as never[])
      .gte("created_at", data.from).lte("created_at", data.to);

    const KIND_METRICS = new Set(["subscription", "tip", "chat_unlock", "publication_unlock", "story_unlock", "video_call", "live_ticket"]);
    if (data.metric !== "total" && KIND_METRICS.has(data.metric)) {
      q = q.eq("kind", data.metric as any);
    }

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
      .from("profiles_public")
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
 * Lista detalhada de assinaturas do criador no período com filtro e busca.
 */
export const getAssinantesList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { from: string; to: string; filter?: "todos" | "renovacoes" | "novos"; q?: string }) => ({
    ...rangeValidator({ from: data.from, to: data.to }),
    filter: data.filter ?? "todos",
    q: (data.q ?? "").trim(),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const now = Date.now();

    const [allRes, periodRes] = await Promise.all([
      supabase.from("subscriptions")
        .select("subscriber_id, status, created_at")
        .eq("creator_profile_id", profileId),

      supabase.from("subscriptions")
        .select("id, subscriber_id, status, price_cents_paid, started_at, current_period_end, created_at")
        .eq("creator_profile_id", profileId)
        .gte("created_at", data.from).lte("created_at", data.to)
        .order("started_at", { ascending: false })
        .limit(500),
    ]);
    if (allRes.error) throw new Error(allRes.error.message);
    if (periodRes.error) throw new Error(periodRes.error.message);

    // Ignora intents PIX abandonados (status pending) — só conta assinaturas efetivamente pagas.
    const PAID_STATUSES = new Set(["active", "canceled", "expired"]);
    const historyBefore = new Set(
      (allRes.data ?? [])
        .filter(s => PAID_STATUSES.has((s as { status?: string }).status ?? "") && new Date(s.created_at as string) < new Date(data.from))
        .map(s => s.subscriber_id as string),
    );

    // Ordenar por created_at asc para calcular "novo vs renovação" corretamente
    const period = (periodRes.data ?? [])
      .filter(s => PAID_STATUSES.has(s.status as string))
      .slice()
      .sort((a, b) => (a.created_at as string).localeCompare(b.created_at as string));

    const seen = new Set<string>();
    const flags = new Map<string, boolean>(); // id -> isRenewal
    for (const s of period) {
      const sid = s.subscriber_id as string;
      const isRenewal = historyBefore.has(sid) || seen.has(sid);
      seen.add(sid);
      flags.set(s.id as string, isRenewal);
    }

    const ids = Array.from(new Set(period.map(s => s.subscriber_id as string)));
    const profsRes = ids.length
      ? await supabase.from("profiles_public")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", ids)
      : { data: [] as { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }[] };
    const byId = Object.fromEntries((profsRes.data ?? []).map(p => [p.user_id as string, p]));

    const needle = data.q.toLowerCase();

    const rows = period
      .filter(s => {
        const isRenewal = flags.get(s.id as string) ?? false;
        if (data.filter === "novos" && isRenewal) return false;
        if (data.filter === "renovacoes" && !isRenewal) return false;
        if (needle) {
          const p = byId[s.subscriber_id as string] as { username?: string | null; display_name?: string | null } | undefined;
          const hay = `${p?.username ?? ""} ${p?.display_name ?? ""}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .map(s => {
        const sid = s.subscriber_id as string;
        const p = byId[sid] as { username?: string | null; display_name?: string | null; avatar_url?: string | null } | undefined;
        const startedAt = (s.started_at ?? s.created_at) as string;
        const periodEnd = s.current_period_end as string | null;
        const endMs = periodEnd ? new Date(periodEnd).getTime() : now;
        const active = s.status === "active" && periodEnd && new Date(periodEnd).getTime() > now;
        const durationMs = Math.max(0, Math.min(endMs, now) - new Date(startedAt).getTime());
        return {
          id: s.id as string,
          subscriberId: sid,
          username: p?.username ?? null,
          displayName: p?.display_name ?? null,
          avatarUrl: p?.avatar_url ?? null,
          statusLabel: (active ? "Ativo" : "Expirado") as "Ativo" | "Expirado",
          priceCents: s.price_cents_paid ?? 0,
          durationDays: Math.max(0, Math.ceil(durationMs / 86400000)),
          isRenewal: flags.get(s.id as string) ?? false,
          startedAt,
        };
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 200);

    return rows;
  });



/**
 * Top 5 países (via country_code).
 */
export const getTopPaises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeValidator)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const { data: rows, error } = await supabase
      .from("transactions")
      .select("country_code, amount_cents_gross")
      .eq("creator_profile_id", profileId).eq("status", "paid")
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
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const startWindow = new Date(); startWindow.setDate(startWindow.getDate() - 400); startWindow.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("creator_streak_days")
      .select("day, publications_count, live_minutes, chat_replies, revenue_cents")
      .eq("creator_profile_id", profileId)
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
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";

    const { data: pubIds } = await supabase
      .from("publications")
      .select("id")
      .eq("creator_profile_id", profileId);
    const ids = (pubIds ?? []).map(p => p.id as string);

    const [profRes, pubRes, followRes, subsAllRes, subsPeriodRes, txRes] = await Promise.all([
      supabase.from("profile_views")
        .select("viewer_id, created_at, country")
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
      supabase.from("subscriptions")
        .select("subscriber_id, created_at")
        .eq("creator_profile_id", profileId),
      supabase.from("subscriptions")
        .select("subscriber_id, price_cents_paid, created_at")
        .eq("creator_profile_id", profileId)
        .gte("created_at", data.from).lte("created_at", data.to)
        .order("created_at", { ascending: true }),
      supabase.from("transactions")
        .select("kind, amount_cents_gross")
        .eq("creator_profile_id", profileId).eq("status", "paid")
        .in("kind", EARNING_KINDS as unknown as never[])
        .gte("created_at", data.from).lte("created_at", data.to),
    ]);

    const profViews = ("data" in profRes ? profRes.data : []) ?? [];
    const pubViews = ("data" in pubRes ? pubRes.data : []) ?? [];
    const follows = ("data" in followRes ? followRes.data : []) ?? [];
    const subsAll = ("data" in subsAllRes ? subsAllRes.data : []) ?? [];
    const subsPeriod = ("data" in subsPeriodRes ? subsPeriodRes.data : []) ?? [];
    const txRows = ("data" in txRes ? txRes.data : []) ?? [];

    const profVisitors = new Set((profViews as { viewer_id: string | null }[]).map(v => v.viewer_id).filter(Boolean));
    const pubVisitors = new Set((pubViews as { viewer_id: string | null }[]).map(v => v.viewer_id).filter(Boolean));

    const dailyMap = new Map<string, { day: string; visits: number; users: number }>();
    const seenPerDay = new Map<string, Set<string>>();
    for (const v of profViews as { viewer_id: string | null; created_at: string }[]) {
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

    // Top países
    const countryMap = new Map<string, { visits: number; users: Set<string> }>();
    for (const v of profViews as { viewer_id: string | null; country: string | null }[]) {
      const key = (v.country ?? "").toUpperCase() || "UNKNOWN";
      const cur = countryMap.get(key) ?? { visits: 0, users: new Set<string>() };
      cur.visits += 1;
      if (v.viewer_id) cur.users.add(v.viewer_id as string);
      countryMap.set(key, cur);
    }
    const topCountries = Array.from(countryMap.entries())
      .map(([country, v]) => ({
        country: country === "UNKNOWN" ? null : country,
        visits: v.visits,
        users: v.users.size,
      }))
      .sort((a, b) => (b.visits + b.users) - (a.visits + a.users))
      .slice(0, 10);

    // Assinaturas: novos vs renovações no período
    const historyBefore = new Set(
      (subsAll as { subscriber_id: string; created_at: string }[])
        .filter(s => new Date(s.created_at) < new Date(data.from))
        .map(s => s.subscriber_id),
    );
    const seenInPeriod = new Set<string>();
    let subscriptionsCount = 0;
    let renewalsCount = 0;
    let subscriptionsRevenueCents = 0;
    for (const s of subsPeriod as { subscriber_id: string; price_cents_paid: number | null }[]) {
      const isRenewal = historyBefore.has(s.subscriber_id) || seenInPeriod.has(s.subscriber_id);
      seenInPeriod.add(s.subscriber_id);
      if (isRenewal) renewalsCount += 1;
      else subscriptionsCount += 1;
      subscriptionsRevenueCents += s.price_cents_paid ?? 0;
    }

    // Breakdown por produto (contagem + faturamento bruto)
    const byProductMap = new Map<string, { count: number; grossCents: number }>();
    for (const t of txRows as { kind: string; amount_cents_gross: number | null }[]) {
      const key = t.kind;
      const cur = byProductMap.get(key) ?? { count: 0, grossCents: 0 };
      cur.count += 1;
      cur.grossCents += t.amount_cents_gross ?? 0;
      byProductMap.set(key, cur);
    }
    const byProduct = Array.from(byProductMap.entries())
      .map(([kind, v]) => ({ kind, count: v.count, grossCents: v.grossCents }))
      .sort((a, b) => b.grossCents - a.grossCents);

    return {
      profileViews: profViews.length,
      profileUniqueViewers: profVisitors.size,
      publicationViews: pubViews.length,
      publicationUniqueViewers: pubVisitors.size,
      newFollowers: follows.length,
      daily,
      topCountries,
      subscriptionsCount,
      renewalsCount,
      subscriptionsRevenueCents,
      byProduct,
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
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const { data: pubs, error } = await supabase
      .from("publications")
      .select("id, caption, visibility, price_cents, published_at, created_at, pinned, archived_at, preview_url")
      .eq("creator_profile_id", profileId)
      .gte("created_at", data.from).lte("created_at", data.to);
    if (error) throw new Error(error.message);
    const { data: profileRow } = await supabase
      .from("profiles_public").select("username").eq("user_id", userId).maybeSingle();
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
        previewUrl: (p as { preview_url?: string | null }).preview_url ?? null,
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
    await signField(items, (it: any) => it.previewUrl, (it: any, v) => { it.previewUrl = v; });

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
  .inputValidator((data: { from: string; to: string; sort?: "revenue" | "tips" | "views" | "likes" | "comments" }) => ({
    ...rangeValidator({ from: data.from, to: data.to }),
    sort: data.sort ?? "revenue",
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const { data: rows, error } = await supabase
      .from("live_sessions")
      .select("id, title, started_at, ended_at, viewers_peak, total_views, gross_cents, tips_cents, cover_url")
      .eq("creator_profile_id", profileId)
      .gte("started_at", data.from).lte("started_at", data.to);
    if (error) throw new Error(error.message);
    const base = rows ?? [];
    const ids = base.map(r => r.id);
    let likesMap = new Map<string, number>();
    let commentsMap = new Map<string, number>();
    if (ids.length > 0) {
      const [likesRes, commentsRes] = await Promise.all([
        supabase.from("live_likes").select("live_id").in("live_id", ids),
        supabase.from("live_comments").select("live_id").in("live_id", ids),
      ]);
      for (const r of (likesRes.data ?? []) as { live_id: string }[]) {
        likesMap.set(r.live_id, (likesMap.get(r.live_id) ?? 0) + 1);
      }
      for (const r of (commentsRes.data ?? []) as { live_id: string }[]) {
        commentsMap.set(r.live_id, (commentsMap.get(r.live_id) ?? 0) + 1);
      }
    }
    const list = base.map(r => ({
      ...r,
      likes: likesMap.get(r.id) ?? 0,
      comments: commentsMap.get(r.id) ?? 0,
    }));
    const sorters = {
      revenue: (a: (typeof list)[number], b: (typeof list)[number]) => (b.gross_cents ?? 0) - (a.gross_cents ?? 0),
      tips: (a: (typeof list)[number], b: (typeof list)[number]) => (b.tips_cents ?? 0) - (a.tips_cents ?? 0),
      views: (a: (typeof list)[number], b: (typeof list)[number]) => (b.total_views ?? 0) - (a.total_views ?? 0),
      likes: (a: (typeof list)[number], b: (typeof list)[number]) => b.likes - a.likes,
      comments: (a: (typeof list)[number], b: (typeof list)[number]) => b.comments - a.comments,
    };
    list.sort(sorters[data.sort]);
    return {
      items: list,
      totalCount: list.length,
      totalRevenue: list.reduce((a, r) => a + (r.gross_cents ?? 0), 0),
      totalViews: list.reduce((a, r) => a + (r.total_views ?? 0), 0),
      totalLikes: list.reduce((a, r) => a + r.likes, 0),
      totalComments: list.reduce((a, r) => a + r.comments, 0),
    };
  });


/**
 * Stories do período (Engajamento › Stories, Top Story).
 */
export const getEngajamentoStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { from: string; to: string; sort?: "revenue" | "unlocks" | "views" }) => ({
    ...rangeValidator({ from: data.from, to: data.to }),
    sort: data.sort ?? "revenue",
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const { data: rows, error } = await supabase
      .from("stories")
      .select("id, media_path, thumb_path, price_cents, published_at")
      .eq("creator_profile_id", profileId)
      .gte("published_at", data.from).lte("published_at", data.to);
    if (error) throw new Error(error.message);
    const base = rows ?? [];
    const ids = base.map(r => r.id as string);
    const unlocksMap = new Map<string, { count: number; revenueCents: number }>();
    const viewsMap = new Map<string, number>();
    if (ids.length > 0) {
      const [unlocksRes, viewsRes] = await Promise.all([
        supabase.from("story_unlocks").select("story_id, amount_cents").in("story_id", ids).eq("status", "paid"),
        supabase.from("story_views").select("story_id").in("story_id", ids),
      ]);
      for (const r of (unlocksRes.data ?? []) as { story_id: string; amount_cents: number | null }[]) {
        const cur = unlocksMap.get(r.story_id) ?? { count: 0, revenueCents: 0 };
        cur.count += 1;
        cur.revenueCents += r.amount_cents ?? 0;
        unlocksMap.set(r.story_id, cur);
      }
      for (const r of (viewsRes.data ?? []) as { story_id: string }[]) {
        viewsMap.set(r.story_id, (viewsMap.get(r.story_id) ?? 0) + 1);
      }
    }
    const list = base.map(r => {
      const u = unlocksMap.get(r.id as string) ?? { count: 0, revenueCents: 0 };
      return {
        id: r.id as string,
        media_path: r.media_path as string | null,
        thumb_path: r.thumb_path as string | null,
        price_cents: r.price_cents as number | null,
        published_at: r.published_at as string,
        unlocks: u.count,
        revenue_cents: u.revenueCents,
        views: viewsMap.get(r.id as string) ?? 0,
      };
    });
    const sorters = {
      revenue: (a: (typeof list)[number], b: (typeof list)[number]) => b.revenue_cents - a.revenue_cents,
      unlocks: (a: (typeof list)[number], b: (typeof list)[number]) => b.unlocks - a.unlocks,
      views: (a: (typeof list)[number], b: (typeof list)[number]) => b.views - a.views,
    };
    list.sort(sorters[data.sort]);
    // Assinar URLs de thumb/media
    const bucket = supabase.storage.from("stories");
    const withUrls = await Promise.all(list.map(async (r) => {
      const path = r.thumb_path ?? r.media_path;
      let cover_url: string | null = null;
      if (path) {
        const { data: signed } = await bucket.createSignedUrl(path, 3600);
        cover_url = signed?.signedUrl ?? null;
      }
      return { ...r, cover_url };
    }));
    return {
      items: withUrls,
      totalCount: withUrls.length,
      totalRevenue: withUrls.reduce((a, r) => a + r.revenue_cents, 0),
      totalUnlocks: withUrls.reduce((a, r) => a + r.unlocks, 0),
      totalViews: withUrls.reduce((a, r) => a + r.views, 0),
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
 * O visitante é derivado do bearer token da requisição (nunca do payload),
 * para que o dono do perfil veja visitantes únicos reais.
 */
export const logProfileView = createServerFn({ method: "POST" })
  .inputValidator((data: { profileId: string; creatorProfileId?: string | null }) => ({
    profileId: String(data.profileId),
    creatorProfileId: data.creatorProfileId ? String(data.creatorProfileId) : null,
  }))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return { ok: false };
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const country = (
      getRequestHeader("cf-ipcountry") ||
      getRequestHeader("x-vercel-ip-country") ||
      getRequestHeader("x-country") ||
      null
    );
    const normalizedCountry = country && country.length === 2 ? country.toUpperCase() : null;

    // Token do visitante (opcional: visitantes anônimos ficam com viewer_id nulo).
    const authHeader = getRequestHeader("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const hasToken = token.split(".").length === 3;

    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        ...(hasToken ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          if (hasToken) h.set("Authorization", `Bearer ${token}`);
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    let viewerId: string | null = null;
    if (hasToken) {
      const { data: claimsData } = await client.auth.getClaims(token);
      viewerId = (claimsData?.claims?.sub as string | undefined) ?? null;
    }

    // Não conta auto-visita.
    if (viewerId && viewerId === data.profileId) return { ok: true, skipped: "self" as const };

    const { error } = await client
      .from("profile_views")
      .insert({
        profile_id: data.profileId,
        creator_profile_id: data.creatorProfileId,
        viewer_id: viewerId,
        country: normalizedCountry,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

/**
 * Heatmap de atividade: distribui profile_views do criador em 7 dias × 8 buckets de 3h.
 */
export const getAssinantesActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(rangeValidator)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const profileId = (await getActiveProfileIdFor(supabase, userId)) ?? "00000000-0000-0000-0000-000000000000";
    const { data: rows, error } = await supabase
      .from("profile_views")
      .select("created_at")
      .eq("profile_id", userId)
      .gte("created_at", data.from)
      .lte("created_at", data.to)
      .limit(1000);
    if (error) throw new Error(error.message);

    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(8).fill(0));
    const hourly: number[] = Array(8).fill(0);
    let total = 0;
    for (const r of rows ?? []) {
      const d = new Date(r.created_at as string);
      const day = d.getDay(); // 0=Sun..6=Sat
      const bucket = Math.floor(d.getHours() / 3); // 0..7
      heatmap[day][bucket] += 1;
      hourly[bucket] += 1;
      total += 1;
    }
    const max = heatmap.reduce((m, row) => Math.max(m, ...row), 0);
    const hourlyMax = Math.max(...hourly);
    const hourlyPct = hourly.map(v => (hourlyMax > 0 ? Math.round((v / hourlyMax) * 100) : 0));
    return { heatmap, max, hourly, hourlyPct, total };
  });

