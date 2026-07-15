import { useState, useMemo } from "react";
import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  Info,
  MessageCircle,
  MoreVertical,
  Radio,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Image as ImageIcon,
  DollarSign,
  Eye,
  UserPlus,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  getEarningsSeries,
  getEarningsByProduct,
  getPeriodTotals,
  getResumoStats,
  getRecordes,
  listExtrato,
  getAssinantesStats,
  getTopAssinantes,
  getTopPaises,
  getStreak,
  getAlcance,
  getEngajamentoPublicacoes,
  getEngajamentoLives,
} from "@/lib/stats.functions";
import { getCreatorEarningsSummary } from "@/lib/finance.functions";

const searchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export const Route = createFileRoute("/_authenticated/my-monetisex-stats")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Meu Monetisexy · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyMonetisexyStatsPage,
});

const MAIN_TABS = ["Visão geral", "Extratos", "Engajamento", "Alcance", "Assinantes"] as const;
const SUB_TABS = ["Faturamento", "Destaques", "Sequência de atividades", "Resumo"] as const;

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatBRL = (cents: number) => BRL.format((cents ?? 0) / 100);
const formatShortBRL = (cents: number) => {
  const v = (cents ?? 0) / 100;
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
};
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const fullDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function useRange() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const range = search.from && search.to ? { from: search.from, to: search.to } : defaultRange();
  const setRange = (r: { from: string; to: string }) =>
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, from: r.from, to: r.to }) });
  return { range, setRange };
}

function MyMonetisexyStatsPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<(typeof MAIN_TABS)[number]>("Visão geral");
  const [subTab, setSubTab] = useState<(typeof SUB_TABS)[number]>("Faturamento");
  const { range, setRange } = useRange();

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-white" />
      <header className="sticky top-0 z-20 border-b border-border bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">Meu Monetisexy</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <RangeSelector range={range} onChange={setRange} />

        <div className="space-y-3">
          <TabsRow tabs={MAIN_TABS} active={mainTab} onChange={setMainTab} />
          {mainTab === "Visão geral" && (
            <SubTabsRow tabs={SUB_TABS} active={subTab} onChange={setSubTab} />
          )}
        </div>

        {mainTab === "Extratos" ? (
          <ExtratosPanel range={range} />
        ) : mainTab === "Engajamento" ? (
          <EngajamentoPanel range={range} />
        ) : mainTab === "Alcance" ? (
          <AlcancePanel range={range} />
        ) : mainTab === "Assinantes" ? (
          <AssinantesPanel range={range} />
        ) : subTab === "Resumo" ? (
          <ResumoPanel range={range} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-5">
              {subTab === "Destaques" ? (
                <DestaquesPanel range={range} />
              ) : subTab === "Sequência de atividades" ? (
                <SequenciaPanel />
              ) : (
                <>
                  <EarningsChartCard range={range} />
                  <ProductTable range={range} />
                </>
              )}
            </div>
            <div className="space-y-5">
              <TopBadgeCard />
              <PeriodTotalCard range={range} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ============================== Range selector ============================== */

const PRESETS = [
  { key: "today", label: "Hoje", days: 0 },
  { key: "7d", label: "Últimos 7 dias", days: 6 },
  { key: "30d", label: "Últimos 30 dias", days: 29 },
  { key: "90d", label: "Últimos 90 dias", days: 89 },
  { key: "month", label: "Este mês" },
  { key: "prevMonth", label: "Mês passado" },
] as const;

function computePreset(key: (typeof PRESETS)[number]["key"]) {
  const now = new Date();
  const to = new Date(now); to.setHours(23, 59, 59, 999);
  if (key === "today") {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (key === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (key === "prevMonth") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { from: from.toISOString(), to: end.toISOString() };
  }
  const preset = PRESETS.find(p => p.key === key) as { days?: number } | undefined;
  const from = new Date(now); from.setDate(from.getDate() - (preset?.days ?? 29)); from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

function rangeLabel(from: string, to: string) {
  return `${shortDate.format(new Date(from))} — ${shortDate.format(new Date(to))}`;
}

function RangeSelector({ range, onChange }: { range: { from: string; to: string }; onChange: (r: { from: string; to: string }) => void }) {
  const [openPreset, setOpenPreset] = useState(false);
  const [openCal, setOpenCal] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-foreground">
        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
        <Popover open={openPreset} onOpenChange={setOpenPreset}>
          <PopoverTrigger asChild>
            <button className="font-semibold inline-flex items-center gap-1">
              Período <ChevronDown className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            {PRESETS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => { onChange(computePreset(p.key)); setOpenPreset(false); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent"
              >{p.label}</button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <Popover open={openCal} onOpenChange={setOpenCal}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="px-4 py-2 rounded-md border border-border bg-card text-sm text-foreground hover:bg-accent transition-colors"
          >
            {rangeLabel(range.from, range.to)}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={{ from: new Date(range.from), to: new Date(range.to) }}
            onSelect={(r) => {
              if (r?.from && r?.to) {
                const from = new Date(r.from); from.setHours(0, 0, 0, 0);
                const to = new Date(r.to); to.setHours(23, 59, 59, 999);
                onChange({ from: from.toISOString(), to: to.toISOString() });
                setOpenCal(false);
              }
            }}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ============================== Chrome ============================== */

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors border ${
        active ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-muted-foreground border-border hover:text-foreground"
      }`}
    >{label}</button>
  );
}

function CardMenu({ items }: { items: { label: string; onSelect?: () => void }[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Mais opções"
          className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        ><MoreVertical className="h-4 w-4" /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 rounded-2xl border-border bg-popover text-popover-foreground shadow-lg p-2">
        {items.map(it => (
          <DropdownMenuItem key={it.label} onSelect={it.onSelect} className="py-3 px-3 text-base cursor-pointer rounded-xl">{it.label}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TabsRow<T extends string>({ tabs, active, onChange }: { tabs: readonly T[]; active: T; onChange: (t: T) => void }) {
  return (
    <div className="rounded-md border border-border bg-card p-1 flex overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`flex-1 min-w-fit whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            t === active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >{t}</button>
      ))}
    </div>
  );
}

function SubTabsRow<T extends string>({ tabs, active, onChange }: { tabs: readonly T[]; active: T; onChange: (t: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
            t === active ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-muted-foreground border-border hover:text-foreground"
          }`}
        >{t}</button>
      ))}
    </div>
  );
}

/* ============================== Query helpers ============================== */

function useSeries(range: { from: string; to: string }) {
  const fn = useServerFn(getEarningsSeries);
  return useQuery({
    queryKey: ["stats", "series", range.from, range.to],
    queryFn: () => fn({ data: range }),
    staleTime: 30_000,
  });
}
function useByProduct(range: { from: string; to: string }) {
  const fn = useServerFn(getEarningsByProduct);
  return useQuery({
    queryKey: ["stats", "byProduct", range.from, range.to],
    queryFn: () => fn({ data: range }),
    staleTime: 30_000,
  });
}
function useTotals(range: { from: string; to: string }) {
  const fn = useServerFn(getPeriodTotals);
  return useQuery({
    queryKey: ["stats", "totals", range.from, range.to],
    queryFn: () => fn({ data: range }),
    staleTime: 30_000,
  });
}
function useResumo(range: { from: string; to: string }) {
  const fn = useServerFn(getResumoStats);
  return useQuery({
    queryKey: ["stats", "resumo", range.from, range.to],
    queryFn: () => fn({ data: range }),
    staleTime: 30_000,
  });
}
function useSummary() {
  const fn = useServerFn(getCreatorEarningsSummary);
  return useQuery({
    queryKey: ["stats", "summary"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });
}

/* ============================== Faturamento cards ============================== */

const KIND_LABEL: Record<string, string> = {
  subscription: "Assinatura",
  tip: "Mimo",
  publication_unlock: "Publicação",
  chat_unlock: "Chat",
  video_call: "Videochamada",
  live_ticket: "Live",
  challenge_contribution: "Desafio",
};
const KIND_COLOR: Record<string, string> = {
  subscription: "bg-purple-500",
  tip: "bg-rose-500",
  publication_unlock: "bg-primary",
  chat_unlock: "bg-emerald-500",
  video_call: "bg-blue-500",
  live_ticket: "bg-sky-500",
  challenge_contribution: "bg-amber-500",
};

function EarningsChartCard({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading } = useSeries(range);
  const total = (data ?? []).reduce((a, r) => a + r.gross, 0);
  const chart = (data ?? []).map(r => ({ ...r, label: shortDate.format(new Date(r.day)) }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-bold tracking-tight">{rangeLabel(range.from, range.to)}</h3>
        <span className="text-lg font-bold">{isLoading ? "—" : formatBRL(total)}</span>
      </div>

      <div className="mt-6 h-56">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : chart.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">Sem faturamento no período.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickFormatter={(v) => formatShortBRL(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={60} />
              <Tooltip formatter={(v: number) => formatBRL(v)} labelFormatter={(l) => l as string} />
              <Line type="monotone" dataKey="gross" name="Bruto" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="net" name="Líquido" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function ProductTable({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading } = useByProduct(range);
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="grid grid-cols-3 px-5 py-3 text-sm text-muted-foreground border-b border-border">
        <span>Produto</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Sua comissão</span>
      </div>
      {isLoading ? (
        <div className="p-5"><Skeleton className="h-6 w-full" /></div>
      ) : (
        <>
          {(data?.items ?? []).map(it => (
            <div key={it.kind} className="grid grid-cols-3 px-5 py-3 items-center border-b border-border/60 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${KIND_COLOR[it.kind] ?? "bg-muted-foreground"}`} />
                {KIND_LABEL[it.kind] ?? it.kind}
              </span>
              <span className="text-right">{formatBRL(it.gross)}</span>
              <span className="text-right">{formatBRL(it.net)}</span>
            </div>
          ))}
          <div className="grid grid-cols-3 px-5 py-4 items-center">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Total
            </div>
            <span className="text-right font-semibold">{formatBRL(data?.totalGross ?? 0)}</span>
            <span className="text-right font-semibold">{formatBRL(data?.totalNet ?? 0)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function TopBadgeCard() {
  const { data, isLoading } = useSummary();
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/15 text-primary grid place-items-center">
          <MessageCircle className="h-5 w-5" />
        </div>
        <span className="font-semibold">Meu banco</span>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Faturamento hoje</p>
        <p className="mt-1 text-xl font-bold">{isLoading ? "—" : formatBRL(data?.revenueTodayCents ?? 0)}</p>
      </div>

      <div className="rounded-xl border border-border bg-background/40 grid grid-cols-2 divide-x divide-border">
        <div className="p-4">
          <p className="text-lg font-bold">{isLoading ? "—" : formatBRL(data?.releasedCents ?? 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Saldo liberado</p>
        </div>
        <div className="p-4">
          <p className="text-lg font-bold">
            {isLoading ? "—" : formatBRL(((data?.pendingNationalCents ?? 0) + (data?.pendingInternationalCents ?? 0)))}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            Saldo a liberar <Info className="h-3 w-3" />
          </p>
        </div>
      </div>

      <Link to="/dashboard" className="block text-center rounded-md border border-border py-3 text-sm font-semibold hover:bg-accent transition-colors">
        Acessar Meu Banco
      </Link>
    </div>
  );
}

function PeriodTotalCard({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading } = useTotals(range);
  const cur = data?.current.gross ?? 0;
  const prev = data?.previous.gross ?? 0;
  const delta = prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
  const positive = delta >= 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-bold">Faturamento no período</h3>
      <p className="mt-3 text-2xl font-bold">{isLoading ? "—" : formatBRL(cur)}</p>
      <p className={`mt-1 text-xs inline-flex items-center gap-1 ${positive ? "text-emerald-600" : "text-rose-600"}`}>
        {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {Math.abs(delta).toFixed(1)}% vs período anterior
      </p>
    </div>
  );
}

/* ============================== Resumo ============================== */

function ResumoPanel({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading } = useResumo(range);
  const summary = useSummary();
  const recordes = useServerFn(getRecordes);
  const recQuery = useQuery({
    queryKey: ["stats", "recordes", range.from, range.to],
    queryFn: () => recordes({ data: range }),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <VendasCard title="Vendas nacionais"
          today={data?.today.national ?? 0} month={data?.month.national ?? 0} history={data?.history.national ?? 0}
          loading={isLoading} />
        <VendasCard title="Vendas internacionais"
          today={data?.today.international ?? 0} month={data?.month.international ?? 0} history={data?.history.international ?? 0}
          loading={isLoading} />
        <MeuBancoCard
          today={summary.data?.revenueTodayCents ?? 0}
          released={summary.data?.releasedCents ?? 0}
          pending={(summary.data?.pendingNationalCents ?? 0) + (summary.data?.pendingInternationalCents ?? 0)}
          loading={summary.isLoading}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <AssinantesCard range={range} />
        <ProjecaoFaturamentoCard
          monthTotal={data?.month.total ?? 0}
          avgDay={data?.month.avgDay ?? 0}
          projection={data?.month.projection ?? 0}
          loading={isLoading}
        />
        <PeriodTotalCard range={range} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <RecordeCard title="Recorde de vendas no dia" rows={recQuery.data?.day ?? []} loading={recQuery.isLoading} />
        <RecordeCard title="Recorde de vendas no mês" rows={recQuery.data?.month ?? []} loading={recQuery.isLoading} />
      </div>
    </div>
  );
}

function VendasCard({ title, today, month, history, loading }: {
  title: string; today: number; month: number; history: number; loading: boolean;
}) {
  const rows = [
    { label: "Hoje", value: today },
    { label: "No mês", value: month },
    { label: "Total faturamento histórico", value: history },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.label} className="rounded-xl bg-muted/60 p-4">
            <p className="text-sm text-muted-foreground">{r.label}</p>
            <p className="mt-1 text-lg font-bold">{loading ? "—" : formatBRL(r.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeuBancoCard({ today, released, pending, loading }: { today: number; released: number; pending: number; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/15 text-primary grid place-items-center">
          <MessageCircle className="h-5 w-5" />
        </div>
        <span className="font-semibold">Meu banco</span>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Faturamento hoje</p>
        <p className="mt-1 text-xl font-bold">{loading ? "—" : formatBRL(today)}</p>
      </div>
      <div className="rounded-xl bg-muted/60 grid grid-cols-2 divide-x divide-border">
        <div className="p-4">
          <p className="text-lg font-bold">{loading ? "—" : formatBRL(released)}</p>
          <p className="text-xs text-muted-foreground mt-1">Saldo liberado</p>
        </div>
        <div className="p-4">
          <p className="text-lg font-bold">{loading ? "—" : formatBRL(pending)}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            Saldo a liberar <Info className="h-3 w-3" />
          </p>
        </div>
      </div>
      <Link to="/dashboard" className="block text-center rounded-md border border-border py-3 text-sm font-semibold hover:bg-accent transition-colors">
        Acessar Meu Banco
      </Link>
    </div>
  );
}

function AssinantesCard({ range }: { range: { from: string; to: string } }) {
  const fn = useServerFn(getAssinantesStats);
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "assinantesCard", range.from, range.to],
    queryFn: () => fn({ data: range }),
    staleTime: 30_000,
  });
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <h3 className="text-lg font-bold tracking-tight">Assinantes</h3>
      <div className="rounded-xl bg-muted/60 p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-bold">{isLoading ? "—" : data?.totalHistorico ?? 0}</span>
      </div>
      <div className="rounded-xl bg-muted/60 p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Ativos</span>
        <span className="text-lg font-bold">{isLoading ? "—" : data?.totalAtivos ?? 0}</span>
      </div>
      <div className="rounded-xl bg-muted/60 p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Novos no período</span>
        <span className="text-lg font-bold">{isLoading ? "—" : data?.novosPeriodo ?? 0}</span>
      </div>
      <div className="rounded-xl bg-muted/60 p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Ticket médio</span>
        <span className="text-lg font-bold">{isLoading ? "—" : formatBRL(data?.ticketMedio ?? 0)}</span>
      </div>
    </div>
  );
}

function ProjecaoFaturamentoCard({ monthTotal, avgDay, projection, loading }: {
  monthTotal: number; avgDay: number; projection: number; loading: boolean;
}) {
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "2-digit" }).format(new Date());
  const delta = monthTotal === 0 ? 0 : ((projection - monthTotal) / monthTotal) * 100;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <div>
        <h3 className="text-lg font-bold tracking-tight">Projeção de Faturamento</h3>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{monthLabel}</p>
      </div>
      <div className="rounded-xl bg-muted/60 p-4">
        <p className="text-sm text-muted-foreground">Total mês</p>
        <p className="mt-1 text-lg font-bold">{loading ? "—" : formatBRL(monthTotal)}</p>
      </div>
      <div className="rounded-xl bg-muted/60 p-4">
        <p className="text-sm text-muted-foreground">Média/dia</p>
        <p className="mt-1 text-lg font-bold">{loading ? "—" : formatBRL(avgDay)}</p>
      </div>
      <div className="rounded-xl bg-muted/60 p-4 flex items-start justify-between">
        <span className="text-sm text-muted-foreground">Projeção</span>
        <div className="text-right">
          <p className="text-lg font-bold text-primary">{loading ? "—" : formatBRL(projection)}</p>
          <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
            {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% <ArrowUp className="h-3 w-3" />
          </p>
        </div>
      </div>
    </div>
  );
}

function RecordeCard({ title, rows, loading }: { title: string; rows: { day: string; gross: number }[]; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <div className="space-y-3">
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados no período.</p>
        ) : rows.map((r, i) => (
          <div key={r.day} className="w-full rounded-xl bg-muted/60 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">TOP {i + 1}</span>
              <span className="text-sm font-semibold">{formatBRL(r.gross)}</span>
            </div>
            <p className="mt-1 text-muted-foreground">{fullDate.format(new Date(r.day))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================== Extratos ============================== */

const EXTRATO_TABS = ["Faturamento", "Ganhos por produto"] as const;
const PRODUTO_OPTIONS = ["Todos os produtos", "Live", "Desafio", "Chat", "Postagem", "Videochamada", "Mimo", "Assinatura"] as const;
const PRODUTO_TO_KIND: Record<string, string | null> = {
  "Todos os produtos": null,
  "Live": "live_ticket",
  "Desafio": "challenge_contribution",
  "Chat": "chat_unlock",
  "Postagem": "publication_unlock",
  "Videochamada": "video_call",
  "Mimo": "tip",
  "Assinatura": "subscription",
};
const EXTRATO_FILTROS = ["Todos", "Concluídos", "A receber", "Estornos"] as const;

function ExtratosPanel({ range }: { range: { from: string; to: string } }) {
  const [extratoTab, setExtratoTab] = useState<(typeof EXTRATO_TABS)[number]>("Faturamento");
  const [produtoFilter, setProdutoFilter] = useState<(typeof PRODUTO_OPTIONS)[number]>("Todos os produtos");
  const [filtro, setFiltro] = useState<(typeof EXTRATO_FILTROS)[number]>("Todos");
  const kind = PRODUTO_TO_KIND[produtoFilter];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {EXTRATO_TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setExtratoTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
              t === extratoTab ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >{t}</button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-card text-foreground border border-border hover:bg-accent transition-colors">
              {produtoFilter}<ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56 rounded-2xl border-border bg-popover text-popover-foreground shadow-lg p-2">
            {PRODUTO_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt} onSelect={() => setProdutoFilter(opt)} className="py-3 px-3 text-base cursor-pointer rounded-xl">{opt}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-5">
          {extratoTab === "Ganhos por produto" ? (
            <>
              <GanhosPorProdutoChartCard range={range} />
              <GanhosPorProdutoTable range={range} />
            </>
          ) : (
            <>
              <ExtratoChartCard title={produtoFilter} range={range} kind={kind} />
              <ExtratoFiltrosRow active={filtro} onChange={setFiltro} />
              <ExtratoTable range={range} kind={kind} filtro={filtro} />
            </>
          )}
        </div>
        <div className="space-y-5">
          <TopBadgeCard />
          <Top5PaisesCard range={range} />
          <ExtratoFaturamentoCard range={range} />
        </div>
      </div>
    </div>
  );
}

function GanhosPorProdutoChartCard({ range }: { range: { from: string; to: string } }) {
  const series = useSeries(range);
  const byProduct = useByProduct(range);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-lg font-bold tracking-tight">Ganhos por produto</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-lg font-bold">{formatBRL(byProduct.data?.totalGross ?? 0)}</span>
        <span className="text-sm text-muted-foreground">total no período</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {(byProduct.data?.items ?? []).map(it => (
          <span key={it.kind} className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${KIND_COLOR[it.kind] ?? "bg-muted-foreground"}`} />
            <span className="text-foreground">{KIND_LABEL[it.kind] ?? it.kind}</span>
          </span>
        ))}
      </div>
      <div className="mt-6 h-56">
        {series.isLoading ? <Skeleton className="h-full w-full" /> : (series.data ?? []).length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">Sem dados.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(series.data ?? []).map(r => ({ ...r, label: shortDate.format(new Date(r.day)) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickFormatter={(v) => formatShortBRL(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={60} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Bar dataKey="gross" name="Bruto" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function GanhosPorProdutoTable({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading } = useByProduct(range);
  const items = data?.items ?? [];
  const total = data?.totalGross ?? 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-10 text-sm text-muted-foreground pb-3 border-b border-border">
        <span>Produto</span>
        <span className="text-right">%</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Comissão</span>
      </div>
      {isLoading ? <div className="p-3"><Skeleton className="h-5 w-full" /></div> :
        items.length === 0 ? <p className="py-6 text-sm text-center text-muted-foreground">Sem vendas no período.</p> :
        items.map(it => (
          <div key={it.kind} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-10 py-3 items-center text-sm border-b border-border/60">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${KIND_COLOR[it.kind] ?? "bg-muted-foreground"}`} />
              {KIND_LABEL[it.kind] ?? it.kind}
            </span>
            <span className="text-right">{total > 0 ? Math.round(it.gross / total * 100) : 0}%</span>
            <span className="text-right">{formatBRL(it.gross)}</span>
            <span className="text-right text-primary">{formatBRL(it.net)}</span>
          </div>
        ))}
      <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] gap-x-10 items-center text-sm">
        <span className="font-bold">Total</span>
        <span />
        <span className="text-right font-bold">{formatBRL(total)}</span>
        <span className="text-right font-bold text-primary">{formatBRL(data?.totalNet ?? 0)}</span>
      </div>
    </div>
  );
}

function ExtratoChartCard({ title, range, kind }: { title: string; range: { from: string; to: string }; kind: string | null }) {
  const series = useSeries(range);
  const byProduct = useByProduct(range);
  const filtered = kind
    ? (byProduct.data?.items.filter(i => i.kind === kind) ?? [])
    : (byProduct.data?.items ?? []);
  const gross = filtered.reduce((a, r) => a + r.gross, 0);
  const net = filtered.reduce((a, r) => a + r.net, 0);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          <span className="text-lg font-bold">{formatBRL(net)}</span>
          <span className="text-sm text-muted-foreground">({formatBRL(gross)} bruto)</span>
        </div>
      </div>
      <div className="mt-6 h-56">
        {series.isLoading ? <Skeleton className="h-full w-full" /> : (series.data ?? []).length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">Sem dados.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={(series.data ?? []).map(r => ({ ...r, label: shortDate.format(new Date(r.day)) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickFormatter={(v) => formatShortBRL(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={60} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Line type="monotone" dataKey="gross" name="Faturamento" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function ExtratoFiltrosRow({ active, onChange }: {
  active: (typeof EXTRATO_FILTROS)[number]; onChange: (f: (typeof EXTRATO_FILTROS)[number]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold text-foreground">Filtrar por</span>
      <div className="flex flex-wrap items-center gap-2">
        {EXTRATO_FILTROS.map(f => <Chip key={f} label={f} active={f === active} onClick={() => onChange(f)} />)}
      </div>
    </div>
  );
}

function ExtratoTable({ range, kind, filtro }: { range: { from: string; to: string }; kind: string | null; filtro: (typeof EXTRATO_FILTROS)[number] }) {
  const fn = useServerFn(listExtrato);
  const kinds = kind ? [kind] : [];
  const statuses =
    filtro === "Concluídos" ? ["paid"] :
    filtro === "A receber" ? ["pending", "authorized", "in_analysis"] :
    filtro === "Estornos" ? ["refunded", "partially_refunded", "cancelled"] : [];
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "extrato", range.from, range.to, kinds.join(","), statuses.join(",")],
    queryFn: () => fn({ data: { ...range, kinds, statuses, limit: 50, offset: 0 } }),
    staleTime: 30_000,
  });
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr] px-5 py-3 text-sm text-muted-foreground border-b border-border">
        <span>Data</span>
        <span>Assinante</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Comissão</span>
        <span className="text-right">Status</span>
      </div>
      {isLoading ? <div className="p-5"><Skeleton className="h-6 w-full" /></div> :
        (data?.items ?? []).length === 0 ? (
          <p className="py-10 px-5 text-center text-sm text-muted-foreground">Nenhuma venda encontrada.</p>
        ) : (data?.items ?? []).map(row => (
          <div key={row.id} className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr] items-center px-5 py-3 text-sm border-b border-border/60">
            <span>{shortDate.format(new Date(row.created_at as string))}</span>
            <span className="truncate">
              {row.buyer?.username ? "@" + row.buyer.username : row.buyer?.display_name ?? "—"}
              <span className="ml-2 text-xs text-muted-foreground">{KIND_LABEL[String(row.kind)] ?? String(row.kind)}</span>
            </span>
            <span className="text-right">{formatBRL(row.amount_cents_gross ?? 0)}</span>
            <span className="text-right">{formatBRL(row.net_cents ?? 0)}</span>
            <span className="text-right"><StatusBadge status={String(row.status)} /></span>
          </div>
        ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Pago", cls: "bg-emerald-100 text-emerald-700" },
    pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
    authorized: { label: "Autorizado", cls: "bg-sky-100 text-sky-700" },
    in_analysis: { label: "Em análise", cls: "bg-slate-100 text-slate-700" },
    refunded: { label: "Estornado", cls: "bg-rose-100 text-rose-700" },
    partially_refunded: { label: "Est. parcial", cls: "bg-rose-100 text-rose-700" },
    cancelled: { label: "Cancelado", cls: "bg-rose-100 text-rose-700" },
    failed: { label: "Falhou", cls: "bg-rose-100 text-rose-700" },
  };
  const it = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={`px-2 py-0.5 rounded-full text-xs ${it.cls}`}>{it.label}</span>;
}

function Top5PaisesCard({ range }: { range: { from: string; to: string } }) {
  const fn = useServerFn(getTopPaises);
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "paises", range.from, range.to],
    queryFn: () => fn({ data: range }),
    staleTime: 30_000,
  });
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-bold">Top 5 países</h3>
      <p className="mt-1 text-sm text-muted-foreground">Países onde você mais faturou</p>
      <div className="mt-3 space-y-2">
        {isLoading ? <Skeleton className="h-5 w-full" /> :
          (data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Sem dados de país no período.</p> :
          (data ?? []).map(r => (
            <div key={r.country} className="flex items-center justify-between text-sm">
              <span>{r.country}</span>
              <span className="font-semibold">{formatBRL(r.gross)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function ExtratoFaturamentoCard({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading } = useTotals(range);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-bold">Faturamento</h3>
      <div className="mt-4 rounded-xl bg-muted/60 p-4">
        <p className="text-sm text-muted-foreground">Bruto</p>
        <p className="mt-1 text-lg font-bold">{isLoading ? "—" : formatBRL(data?.current.gross ?? 0)}</p>
      </div>
      <div className="mt-3 rounded-xl bg-muted/60 p-4">
        <p className="text-sm text-muted-foreground">Comissão líquida</p>
        <p className="mt-1 text-lg font-bold text-primary">{isLoading ? "—" : formatBRL(data?.current.net ?? 0)}</p>
      </div>
    </div>
  );
}

/* ============================== Engajamento ============================== */

const ENGAJAMENTO_TABS = ["Publicações", "Lives"] as const;
const ORDENAR_PUBLICACOES = ["Recentes", "Faturamento", "Mimos", "Curtidas", "Comentários"] as const;
const ORDENAR_LIVES = ["Mais compradas", "Mimos", "Visualizações"] as const;

function EngajamentoPanel({ range }: { range: { from: string; to: string } }) {
  const [tab, setTab] = useState<(typeof ENGAJAMENTO_TABS)[number]>("Publicações");
  const [ordenarPub, setOrdenarPub] = useState<(typeof ORDENAR_PUBLICACOES)[number]>("Recentes");
  const [ordenarLive, setOrdenarLive] = useState<(typeof ORDENAR_LIVES)[number]>("Mais compradas");
  const isLives = tab === "Lives";
  const pubSortMap: Record<(typeof ORDENAR_PUBLICACOES)[number], "recent"|"revenue"|"tips"|"likes"|"comments"> = {
    "Recentes": "recent", "Faturamento": "revenue", "Mimos": "tips", "Curtidas": "likes", "Comentários": "comments",
  };
  const liveSortMap: Record<(typeof ORDENAR_LIVES)[number], "revenue"|"tips"|"views"> = {
    "Mais compradas": "revenue", "Mimos": "tips", "Visualizações": "views",
  };
  const pubFn = useServerFn(getEngajamentoPublicacoes);
  const pubQ = useQuery({
    queryKey: ["stats", "engPub", range.from, range.to, ordenarPub],
    queryFn: () => pubFn({ data: { ...range, sort: pubSortMap[ordenarPub] } }),
    enabled: !isLives, staleTime: 30_000,
  });
  const liveFn = useServerFn(getEngajamentoLives);
  const liveQ = useQuery({
    queryKey: ["stats", "engLive", range.from, range.to, ordenarLive],
    queryFn: () => liveFn({ data: { ...range, sort: liveSortMap[ordenarLive] } }),
    enabled: isLives, staleTime: 30_000,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {ENGAJAMENTO_TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
              t === tab ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}>{t}</button>
        ))}
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <p className="text-sm font-bold text-foreground">Ordenar por</p>
        <div className="flex flex-wrap items-center gap-2">
          {(isLives ? ORDENAR_LIVES : ORDENAR_PUBLICACOES).map(o => (
            <Chip key={o} label={o} active={isLives ? o === ordenarLive : o === ordenarPub}
              onClick={() => isLives ? setOrdenarLive(o as (typeof ORDENAR_LIVES)[number]) : setOrdenarPub(o as (typeof ORDENAR_PUBLICACOES)[number])} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            {isLives ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="text-base font-bold">{liveQ.data?.totalCount ?? 0} lives</span>
                  <span className="text-base font-bold">{formatBRL(liveQ.data?.totalRevenue ?? 0)}</span>
                </div>
                {liveQ.isLoading ? <Skeleton className="mt-6 h-40" /> :
                  (liveQ.data?.items ?? []).length === 0 ? (
                    <p className="mt-8 text-center text-sm text-muted-foreground">Sem lives no período.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {(liveQ.data?.items ?? []).map(l => (
                        <div key={l.id} className="rounded-xl bg-muted/50 p-3 flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-muted grid place-items-center"><Radio className="h-5 w-5 text-primary" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{l.title ?? "Live"}</p>
                            <p className="text-xs text-muted-foreground">{fullDate.format(new Date(l.started_at as string))}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-semibold">{formatBRL(l.gross_cents ?? 0)}</p>
                            <p className="text-xs text-muted-foreground">{l.total_views ?? 0} views</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="text-base font-bold">{pubQ.data?.totalCount ?? 0} postagens</span>
                  <span className="text-base font-bold">{formatBRL(pubQ.data?.totalRevenue ?? 0)}</span>
                </div>
                {pubQ.isLoading ? <Skeleton className="mt-6 h-40" /> :
                  (pubQ.data?.items ?? []).length === 0 ? (
                    <p className="mt-8 text-center text-sm text-muted-foreground">Nenhuma publicação no período.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {(pubQ.data?.items ?? []).map(p => (
                        <Link key={p.id} to="/feed" className="block rounded-xl bg-muted/50 p-3">
                          <p className="font-semibold truncate">{p.caption || "(sem legenda)"}</p>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>{fullDate.format(new Date(p.publishedAt as string))}</span>
                            <span>{p.likes} curtidas</span>
                            <span>{p.comments} coment.</span>
                            <span>{p.tips} mimos</span>
                            <span className="font-semibold text-foreground">{formatBRL(p.revenue)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-bold">Resumo</h3>
            {isLives ? (
              <div className="mt-4 space-y-4">
                <ResumoItem icon={Radio} label="Quantidade" value={String(liveQ.data?.totalCount ?? 0)} />
                <ResumoItem icon={Eye} label="Visualizações" value={String(liveQ.data?.totalViews ?? 0)} />
                <ResumoItem icon={DollarSign} label="Faturamento" value={formatBRL(liveQ.data?.totalRevenue ?? 0)} />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <ResumoItem icon={ImageIcon} label="Quantidade" value={String(pubQ.data?.totalCount ?? 0)} />
                <ResumoItem icon={DollarSign} label="Faturamento" value={formatBRL(pubQ.data?.totalRevenue ?? 0)} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-bold">{isLives ? "Top live" : "Top postagem"}</h3>
            {(isLives ? liveQ.data?.items?.[0] : pubQ.data?.items?.[0]) ? (
              isLives ? (
                <div className="mt-3 text-sm">
                  <p className="font-semibold">{liveQ.data?.items?.[0]?.title ?? "Live"}</p>
                  <p className="text-muted-foreground text-xs">{formatBRL(liveQ.data?.items?.[0]?.gross_cents ?? 0)}</p>
                </div>
              ) : (
                <div className="mt-3 text-sm">
                  <p className="font-semibold truncate">{pubQ.data?.items?.[0]?.caption || "(sem legenda)"}</p>
                  <p className="text-muted-foreground text-xs">{formatBRL(pubQ.data?.items?.[0]?.revenue ?? 0)}</p>
                </div>
              )
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">{isLives ? "Sem lives no período." : "Nenhuma postagem no período."}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumoItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-base font-bold">{value}</p>
      </div>
    </div>
  );
}

/* ============================== Alcance ============================== */

function AlcancePanel({ range }: { range: { from: string; to: string } }) {
  const fn = useServerFn(getAlcance);
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "alcance", range.from, range.to],
    queryFn: () => fn({ data: range }),
    staleTime: 30_000,
  });
  const chart = (data?.daily ?? []).map(r => ({ ...r, label: shortDate.format(new Date(r.day)) }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold tracking-tight">{data?.profileViews ?? 0} Visitantes</h3>
            </div>
            <div className="mt-6 h-56">
              {isLoading ? <Skeleton className="h-full w-full" /> : chart.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">Nenhum visitante no período.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={40} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="visits" name="Visitas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="users" name="Usuários únicos" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 text-sm text-muted-foreground border-b border-border pb-3">
              <span />
              <span className="text-right">Visitas</span>
              <span className="text-right">Usuários</span>
              <span className="text-right">Publicações</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 items-center pt-4 text-sm">
              <span className="text-foreground">Visitantes do perfil</span>
              <span className="text-right">{data?.profileViews ?? 0}</span>
              <span className="text-right">{data?.profileUniqueViewers ?? 0}</span>
              <span className="text-right font-bold">{data?.publicationViews ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-bold">Resumo</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <ResumoItem icon={Users} label="Visitantes" value={String(data?.profileViews ?? 0)} />
              <ResumoItem icon={Eye} label="Visualizações posts" value={String(data?.publicationViews ?? 0)} />
              <ResumoItem icon={UserPlus} label="Novos seguidores" value={String(data?.newFollowers ?? 0)} />
              <ResumoItem icon={Users} label="Usuários únicos" value={String(data?.profileUniqueViewers ?? 0)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== Assinantes ============================== */

const ASSINANTES_TABS = ["Assinaturas", "Top assinantes"] as const;
const TOP_ASSINANTES_CHIPS = ["Total", "Assinaturas", "Mimos", "Chat"] as const;
const TOP_METRIC_MAP: Record<(typeof TOP_ASSINANTES_CHIPS)[number], "total"|"subscription"|"tip"|"chat_unlock"> = {
  Total: "total", Assinaturas: "subscription", Mimos: "tip", Chat: "chat_unlock",
};

function AssinantesPanel({ range }: { range: { from: string; to: string } }) {
  const [tab, setTab] = useState<(typeof ASSINANTES_TABS)[number]>("Assinaturas");
  const [topFiltro, setTopFiltro] = useState<(typeof TOP_ASSINANTES_CHIPS)[number]>("Total");

  const statsFn = useServerFn(getAssinantesStats);
  const stats = useQuery({
    queryKey: ["stats", "assinantes", range.from, range.to],
    queryFn: () => statsFn({ data: range }),
    staleTime: 30_000,
  });
  const topFn = useServerFn(getTopAssinantes);
  const top = useQuery({
    queryKey: ["stats", "topAssinantes", range.from, range.to, topFiltro],
    queryFn: () => topFn({ data: { ...range, metric: TOP_METRIC_MAP[topFiltro] } }),
    staleTime: 30_000,
  });

  const chart = (stats.data?.daily ?? []).map(r => ({ ...r, label: shortDate.format(new Date(r.day)) }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {ASSINANTES_TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
              t === tab ? "bg-primary/15 text-primary border-primary/30" : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}>{t}</button>
        ))}
      </div>

      <div className="border-t border-border pt-5">
        {tab === "Assinaturas" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-bold">{stats.data?.totalAtivos ?? 0} Ativos · {formatBRL(stats.data?.faturamentoPeriodo ?? 0)}</h3>
                </div>
                <div className="mt-6 h-64">
                  {stats.isLoading ? <Skeleton className="h-full w-full" /> : chart.length === 0 ? (
                    <div className="h-full grid place-items-center text-sm text-muted-foreground">Nenhum dado disponível.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={30} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="novos" name="Novos" fill="hsl(var(--primary))" />
                        <Bar dataKey="renovacoes" name="Renovações" fill="hsl(var(--muted-foreground))" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox label="Ativos" value={stats.data?.totalAtivos ?? 0} loading={stats.isLoading} />
                <StatBox label="Novos" value={stats.data?.novosPeriodo ?? 0} loading={stats.isLoading} />
                <StatBox label="Renovações" value={stats.data?.renovacoesPeriodo ?? 0} loading={stats.isLoading} />
                <StatBox label="Ticket médio" value={formatBRL(stats.data?.ticketMedio ?? 0)} loading={stats.isLoading} />
              </div>
            </div>
            <div className="space-y-5">
              <TopAssinantesInline top={top.data ?? []} loading={top.isLoading} filtro={topFiltro} onFiltro={setTopFiltro} />
            </div>
          </div>
        ) : (
          <TopAssinantesInline top={top.data ?? []} loading={top.isLoading} filtro={topFiltro} onFiltro={setTopFiltro} full />
        )}
      </div>
    </div>
  );
}

function TopAssinantesInline({ top, loading, filtro, onFiltro, full }: {
  top: { buyerId: string; gross: number; username: string | null; displayName: string | null; avatarUrl: string | null }[];
  loading: boolean;
  filtro: (typeof TOP_ASSINANTES_CHIPS)[number];
  onFiltro: (f: (typeof TOP_ASSINANTES_CHIPS)[number]) => void;
  full?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h3 className="text-base font-bold">Top assinantes</h3></div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {TOP_ASSINANTES_CHIPS.map(c => (
          <div key={c} className="shrink-0"><Chip label={c} active={c === filtro} onClick={() => onFiltro(c)} /></div>
        ))}
      </div>
      {loading ? <Skeleton className="mt-4 h-32 w-full" /> :
        top.length === 0 ? <p className="mt-6 text-center text-sm text-muted-foreground">Sem dados para este filtro.</p> :
        <div className={`mt-4 ${full ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-3"}`}>
          {top.map((t, i) => (
            <div key={t.buyerId} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <span className="font-bold text-muted-foreground w-6">#{i + 1}</span>
              {t.avatarUrl ? <img src={t.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> :
                <div className="h-9 w-9 rounded-md bg-muted grid place-items-center"><Users className="h-4 w-4 text-muted-foreground" /></div>}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{t.displayName ?? t.username ?? "Usuário"}</p>
                {t.username && <p className="text-xs text-muted-foreground truncate">@{t.username}</p>}
              </div>
              <span className="font-bold">{formatBRL(t.gross)}</span>
            </div>
          ))}
        </div>}
    </div>
  );
}

function StatBox({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{loading ? "—" : value}</p>
    </div>
  );
}

/* ============================== Destaques ============================== */

function DestaquesPanel({ range }: { range: { from: string; to: string } }) {
  const pubFn = useServerFn(getEngajamentoPublicacoes);
  const pubQ = useQuery({
    queryKey: ["stats", "destaques", range.from, range.to],
    queryFn: () => pubFn({ data: { ...range, sort: "revenue" } }),
    staleTime: 30_000,
  });
  const liveFn = useServerFn(getEngajamentoLives);
  const liveQ = useQuery({
    queryKey: ["stats", "destaquesLive", range.from, range.to],
    queryFn: () => liveFn({ data: { ...range, sort: "revenue" } }),
    staleTime: 30_000,
  });
  const topFn = useServerFn(getTopAssinantes);
  const topQ = useQuery({
    queryKey: ["stats", "destaquesTop", range.from, range.to],
    queryFn: () => topFn({ data: { ...range, metric: "total" } }),
    staleTime: 30_000,
  });

  const topPub = pubQ.data?.items?.[0];
  const topLive = liveQ.data?.items?.[0];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /><h3 className="text-lg font-bold">Top postagem</h3></div>
        {pubQ.isLoading ? <Skeleton className="mt-6 h-16 w-full" /> :
          !topPub ? <p className="mt-6 text-center text-sm text-muted-foreground">Nenhuma postagem no período.</p> : (
            <Link to="/feed" className="mt-4 block rounded-xl bg-muted/50 p-4">
              <p className="font-semibold truncate">{topPub.caption || "(sem legenda)"}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>{fullDate.format(new Date(topPub.publishedAt as string))}</span>
                <span>{topPub.likes} curtidas</span>
                <span>{topPub.comments} coment.</span>
                <span className="font-semibold text-foreground">{formatBRL(topPub.revenue)}</span>
              </div>
            </Link>
          )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2"><Radio className="h-5 w-5 text-primary" /><h3 className="text-lg font-bold">Top live</h3></div>
        {liveQ.isLoading ? <Skeleton className="mt-6 h-16 w-full" /> :
          !topLive ? <p className="mt-6 text-center text-sm text-muted-foreground">Nenhuma live no período.</p> : (
            <div className="mt-4 rounded-xl bg-muted/50 p-4">
              <p className="font-semibold truncate">{topLive.title ?? "Live"}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>{fullDate.format(new Date(topLive.started_at as string))}</span>
                <span>{topLive.total_views ?? 0} views</span>
                <span className="font-semibold text-foreground">{formatBRL(topLive.gross_cents ?? 0)}</span>
              </div>
            </div>
          )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h3 className="text-lg font-bold">Top assinantes</h3></div>
        {topQ.isLoading ? <Skeleton className="mt-6 h-32 w-full" /> :
          (topQ.data ?? []).length === 0 ? <p className="mt-6 text-center text-sm text-muted-foreground">Sem dados no período.</p> : (
            <div className="mt-4 space-y-2">
              {(topQ.data ?? []).slice(0, 5).map((t, i) => (
                <div key={t.buyerId} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                  <span className="font-bold text-muted-foreground w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{t.displayName ?? t.username ?? "Usuário"}</p>
                  </div>
                  <span className="font-bold">{formatBRL(t.gross)}</span>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

/* ============================== Sequência ============================== */

function SequenciaPanel() {
  const fn = useServerFn(getStreak);
  const { data, isLoading } = useQuery({
    queryKey: ["stats", "streak"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });
  const activeDays = useMemo(() => new Set(data?.activeDays ?? []), [data]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] flex items-center gap-3">
        <Trophy className="h-5 w-5 text-primary shrink-0" />
        <p className="flex-1 font-semibold">Poste e divulgue para continuar crescendo!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border-2 border-primary bg-card p-5 shadow-[var(--shadow-card)] text-center">
          <p className="text-sm text-muted-foreground">Sequência atual</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-2xl font-bold text-primary">{isLoading ? "—" : `${data?.currentStreak ?? 0} dias`}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] text-center">
          <p className="text-sm text-muted-foreground">Sequência mais longa</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <span className="text-2xl font-bold">{isLoading ? "—" : `${data?.longestStreak ?? 0} dias`}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-bold">Atividade no mês</h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <StatBox label="Postagens" value={data?.monthTotals.pubs ?? 0} loading={isLoading} />
          <StatBox label="Minutos em live" value={data?.monthTotals.live ?? 0} loading={isLoading} />
          <StatBox label="Respostas no chat" value={data?.monthTotals.chat ?? 0} loading={isLoading} />
          <StatBox label="Faturamento" value={formatBRL(data?.monthTotals.revenue ?? 0)} loading={isLoading} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <Calendar
          mode="multiple"
          selected={Array.from(activeDays).map(d => new Date(d))}
          defaultMonth={new Date()}
          showOutsideDays={false}
          className="p-3 pointer-events-auto w-full"
        />
      </div>
    </div>
  );
}
