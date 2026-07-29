import { Fragment, useState, useMemo, useDeferredValue } from "react";
import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { z } from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ActionPopover,
  ActionPopoverList,
  ActionPopoverItem,
} from "@/components/ui/action-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  RefreshCw,
  Search,

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
  ComposedChart,
  AreaChart,
  Area,
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
  getAssinantesActivity,
  getAssinantesList,
  getTopPaises,
  getStreak,
  getAlcance,
  getEngajamentoPublicacoes,
  getEngajamentoLives,
} from "@/lib/stats.functions";
import { getCreatorEarningsSummary } from "@/lib/finance.functions";
import { setPublicationPinned, setPublicationArchived } from "@/lib/publications.functions";
import { listMyIncomingFriends, setFriendshipVisibility } from "@/lib/friends.functions";
import { Switch } from "@/components/ui/switch";


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

const MAIN_TABS = ["Visão geral", "Extratos", "Engajamento", "Alcance", "Assinantes", "Superfãs"] as const;
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

function useActiveProfileMode() {
  return useQuery({
    queryKey: ["stats-active-profile-mode"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return { activeView: "creator" as const, canSwitch: false };
      const { data } = await supabase
        .from("profiles")
        .select("active_view, account_type, free_profile_enabled")
        .eq("user_id", uid)
        .maybeSingle();
      const canSwitch =
        data?.account_type === "free_creator" ||
        (data?.account_type === "creator" && data?.free_profile_enabled === true);
      return {
        activeView: (data?.active_view ?? "creator") as "creator" | "free",
        canSwitch,
      };
    },
    staleTime: 30_000,
  });
}

function FreeProfileStatsNotice() {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm text-foreground">
      <p className="font-semibold mb-1">Você está no perfil gratuito</p>
      <p className="text-muted-foreground">
        As estatísticas de faturamento, assinantes e recebimentos são exclusivas do <strong>perfil pago</strong>.
        Alterne para o perfil pago no dashboard para visualizar seu Monetisexy.
      </p>
    </div>
  );
}

function MyMonetisexyStatsPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<(typeof MAIN_TABS)[number]>("Visão geral");
  const [subTab, setSubTab] = useState<(typeof SUB_TABS)[number]>("Faturamento");
  const { range, setRange } = useRange();
  const { data: mode } = useActiveProfileMode();
  const isFreeMode = mode?.activeView === "free";

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
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

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {isFreeMode ? (
          <FreeProfileStatsNotice />
        ) : (
          <>
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
        ) : mainTab === "Superfãs" ? (
          <SuperfasPanel />
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
          </>
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
    <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">

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

function CardMenu({ items }: { items: { label: string; onSelect?: () => void; disabled?: boolean }[] }) {
  return (
    <ActionPopover
      widthClass="w-[260px]"
      trigger={
        <button
          type="button"
          aria-label="Mais opções"
          className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        ><MoreVertical className="h-4 w-4" /></button>
      }
    >
      <ActionPopoverList>
        {items.map((it) => (
          <ActionPopoverItem
            key={it.label}
            label={it.label}
            onClick={it.onSelect}
            disabled={it.disabled}
          />
        ))}
      </ActionPopoverList>
    </ActionPopover>
  );
}


function TabsRow<T extends string>({ tabs, active, onChange }: { tabs: readonly T[]; active: T; onChange: (t: T) => void }) {
  return (
    <>
      {/* Mobile: dropdown */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-primary"
            >
              <span>{active}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] rounded-2xl border-border bg-popover text-popover-foreground shadow-lg p-2">
            {tabs.map(t => (
              <DropdownMenuItem
                key={t}
                onSelect={() => onChange(t)}
                className={`py-3 px-3 text-base cursor-pointer rounded-xl ${
                  t === active ? "bg-primary/15 text-primary" : ""
                }`}
              >
                {t}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Desktop: tabs lado a lado */}
      <div className="hidden sm:flex rounded-md border border-border bg-card p-1">
        {tabs.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`flex-1 whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              t === active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >{t}</button>
        ))}
      </div>
    </>
  );
}

function SubTabsRow<T extends string>({ tabs, active, onChange }: { tabs: readonly T[]; active: T; onChange: (t: T) => void }) {
  return (
    <>
      {/* Mobile: dropdown */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
            >
              <span>{active}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] rounded-2xl border-border bg-popover text-popover-foreground shadow-lg p-2">
            {tabs.map(t => (
              <DropdownMenuItem
                key={t}
                onSelect={() => onChange(t)}
                className={`py-3 px-3 text-base cursor-pointer rounded-xl ${
                  t === active ? "bg-primary/15 text-primary" : ""
                }`}
              >
                {t}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Desktop: chips lado a lado */}
      <div className="hidden sm:flex flex-wrap gap-2">
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
    </>
  );
}

function CardTabsRow<T extends string>({ tabs, active, onChange, className }: { tabs: readonly T[]; active: T; onChange: (t: T) => void; className?: string }) {
  return (
    <>
      {/* Mobile: dropdown */}
      <div className={`sm:hidden ${className ?? ""}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
            >
              <span className="truncate">{active}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] rounded-2xl border-border bg-popover text-popover-foreground shadow-lg p-2">
            {tabs.map(t => (
              <DropdownMenuItem
                key={t}
                onSelect={() => onChange(t)}
                className={`py-3 px-3 text-base cursor-pointer rounded-xl ${t === active ? "bg-primary/15 text-primary" : ""}`}
              >
                {t}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Desktop: chips lado a lado */}
      <div className={`hidden sm:flex flex-wrap gap-2 ${className ?? ""}`}>
        {tabs.map(t => (
          <Chip key={t} label={t} active={t === active} onClick={() => onChange(t)} />
        ))}
      </div>
    </>
  );
}



/* ============================== Query helpers ============================== */

function useSeries(range: { from: string; to: string }, kind: string | null = null) {
  const fn = useServerFn(getEarningsSeries);
  return useQuery({
    queryKey: ["stats", "series", range.from, range.to, kind],
    queryFn: () => fn({ data: { ...range, kind } }),
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
  story_unlock: "Story",
};
const KIND_COLOR: Record<string, string> = {
  subscription: "bg-purple-500",
  tip: "bg-rose-500",
  publication_unlock: "bg-primary",
  chat_unlock: "bg-emerald-500",
  video_call: "bg-blue-500",
  live_ticket: "bg-sky-500",
  challenge_contribution: "bg-amber-500",
  story_unlock: "bg-fuchsia-500",
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
        <div className="h-9 w-9 rounded-full bg-primary/15 text-primary grid place-items-center">
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

      <Link to="/banco" className="block text-center rounded-md border border-border py-3 text-sm font-semibold hover:bg-accent transition-colors">
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
        <div className="h-9 w-9 rounded-full bg-primary/15 text-primary grid place-items-center">
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
const PRODUTO_OPTIONS = ["Todos os produtos", "Live", "Desafio", "Chat", "Postagem", "Story", "Videochamada", "Mimo", "Assinatura"] as const;
const PRODUTO_TO_KIND: Record<string, string | null> = {
  "Todos os produtos": null,
  "Live": "live_ticket",
  "Desafio": "challenge_contribution",
  "Chat": "chat_unlock",
  "Postagem": "publication_unlock",
  "Story": "story_unlock",
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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="sm:contents">
          <SubTabsRow tabs={EXTRATO_TABS} active={extratoTab} onChange={setExtratoTab} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2 px-4 py-2 rounded-md text-sm font-medium bg-card text-foreground border border-border hover:bg-accent transition-colors">
              {produtoFilter}<ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] sm:w-auto sm:min-w-56 rounded-2xl border-border bg-popover text-popover-foreground shadow-lg p-2">
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
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 sm:gap-x-10 text-xs sm:text-sm text-muted-foreground pb-3 border-b border-border">
        <span>Produto</span>
        <span className="text-right">%</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Comissão</span>
      </div>
      {isLoading ? <div className="p-3"><Skeleton className="h-5 w-full" /></div> :
        items.length === 0 ? <p className="py-6 text-sm text-center text-muted-foreground">Sem vendas no período.</p> :
        items.map(it => (
          <div key={it.kind} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 sm:gap-x-10 py-3 items-center text-xs sm:text-sm border-b border-border/60">
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className={`h-2 w-2 shrink-0 rounded-full ${KIND_COLOR[it.kind] ?? "bg-muted-foreground"}`} />
              <span className="truncate">{KIND_LABEL[it.kind] ?? it.kind}</span>
            </span>
            <span className="text-right">{total > 0 ? Math.round(it.gross / total * 100) : 0}%</span>
            <span className="text-right">{formatBRL(it.gross)}</span>
            <span className="text-right text-primary">{formatBRL(it.net)}</span>
          </div>
        ))}
      <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 sm:gap-x-10 items-center text-xs sm:text-sm">
        <span className="font-bold">Total</span>
        <span />
        <span className="text-right font-bold">{formatBRL(total)}</span>
        <span className="text-right font-bold text-primary">{formatBRL(data?.totalNet ?? 0)}</span>
      </div>
    </div>
  );
}

function ExtratoChartCard({ title, range, kind }: { title: string; range: { from: string; to: string }; kind: string | null }) {
  const series = useSeries(range, kind);
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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <span className="text-sm font-semibold text-foreground">Filtrar por</span>
      <div className="sm:flex-1">
        <CardTabsRow tabs={EXTRATO_FILTROS} active={active} onChange={onChange} />
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
const ORDENAR_LIVES = ["Mais compradas", "Mimos", "Visualizações", "Comentários", "Curtidas"] as const;

function EngajamentoPanel({ range }: { range: { from: string; to: string } }) {
  const [tab, setTab] = useState<(typeof ENGAJAMENTO_TABS)[number]>("Publicações");
  const [ordenarPub, setOrdenarPub] = useState<(typeof ORDENAR_PUBLICACOES)[number]>("Recentes");
  const [ordenarLive, setOrdenarLive] = useState<(typeof ORDENAR_LIVES)[number]>("Mais compradas");
  const isLives = tab === "Lives";
  const pubSortMap: Record<(typeof ORDENAR_PUBLICACOES)[number], "recent"|"revenue"|"tips"|"likes"|"comments"> = {
    "Recentes": "recent", "Faturamento": "revenue", "Mimos": "tips", "Curtidas": "likes", "Comentários": "comments",
  };
  const liveSortMap: Record<(typeof ORDENAR_LIVES)[number], "revenue"|"tips"|"views"|"likes"|"comments"> = {
    "Mais compradas": "revenue", "Mimos": "tips", "Visualizações": "views", "Comentários": "comments", "Curtidas": "likes",
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
      <SubTabsRow tabs={ENGAJAMENTO_TABS} active={tab} onChange={setTab} />

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
            {isLives ? (() => {
              const cfg: Record<(typeof ORDENAR_LIVES)[number], { label: string; format: "brl" | "int"; get: (l: NonNullable<typeof liveQ.data>["items"][number]) => number }> = {
                "Mais compradas": { label: "Faturamento", format: "brl", get: l => (l.gross_cents ?? 0) / 100 },
                "Mimos": { label: "Mimos", format: "brl", get: l => (l.tips_cents ?? 0) / 100 },
                "Visualizações": { label: "Visualizações", format: "int", get: l => l.total_views ?? 0 },
                "Comentários": { label: "Comentários", format: "int", get: l => l.comments ?? 0 },
                "Curtidas": { label: "Curtidas", format: "int", get: l => l.likes ?? 0 },
              };
              const c = cfg[ordenarLive];
              return (
                <EngajamentoChart
                  loading={liveQ.isLoading}
                  totalLabel={`${liveQ.data?.totalCount ?? 0} lives`}
                  totalRevenue={liveQ.data?.totalRevenue ?? 0}
                  range={range}
                  metricLabel={c.label}
                  metricFormat={c.format}
                  items={(liveQ.data?.items ?? []).map(l => ({
                    date: l.started_at as string,
                    metric: c.get(l),
                  }))}
                />
              );
            })() : (() => {
              const cfg: Record<(typeof ORDENAR_PUBLICACOES)[number], { label: string; format: "brl" | "int"; get: (p: NonNullable<typeof pubQ.data>["items"][number]) => number }> = {
                "Recentes": { label: "Faturamento", format: "brl", get: p => p.revenue ?? 0 },
                "Faturamento": { label: "Faturamento", format: "brl", get: p => p.revenue ?? 0 },
                "Mimos": { label: "Mimos", format: "brl", get: p => p.tips ?? 0 },
                "Curtidas": { label: "Curtidas", format: "int", get: p => p.likes ?? 0 },
                "Comentários": { label: "Comentários", format: "int", get: p => p.comments ?? 0 },
              };
              const c = cfg[ordenarPub];
              return (
                <EngajamentoChart
                  loading={pubQ.isLoading}
                  totalLabel={`${pubQ.data?.totalCount ?? 0} postagens`}
                  totalRevenue={pubQ.data?.totalRevenue ?? 0}
                  range={range}
                  metricLabel={c.label}
                  metricFormat={c.format}
                  items={(pubQ.data?.items ?? []).map(p => ({
                    date: p.publishedAt as string,
                    metric: c.get(p),
                  }))}
                />
              );
            })()}
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

          {(() => {
            const topPub = [...(pubQ.data?.items ?? [])].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))[0];
            const topLive = [...(liveQ.data?.items ?? [])].sort((a, b) => (b.gross_cents ?? 0) - (a.gross_cents ?? 0))[0];
            const hasTop = isLives ? !!topLive : !!topPub;
            return (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <h3 className="text-base font-bold">{isLives ? "Top live" : "Top postagem"}</h3>
                {!hasTop ? (
                  <p className="mt-6 text-sm text-muted-foreground">{isLives ? "Sem lives no período." : "Nenhuma postagem no período."}</p>
                ) : isLives ? (
                  <div className="mt-3 flex items-center gap-3">
                    {topLive!.cover_url ? (
                      <img src={topLive!.cover_url} alt="Miniatura da live" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-lg bg-muted"><Radio className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-semibold truncate">{topLive!.title ?? "Live"}</p>
                      <p className="text-muted-foreground text-xs">{fullDate.format(new Date(topLive!.started_at as string))}</p>
                      <p className="text-xs font-semibold text-foreground">{formatBRL(topLive!.gross_cents ?? 0)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-3">
                    {topPub!.previewUrl ? (
                      <img src={topPub!.previewUrl} alt="Miniatura da postagem" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-lg bg-muted"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-semibold truncate">{topPub!.caption || "(sem legenda)"}</p>
                      <p className="text-muted-foreground text-xs">{fullDate.format(new Date(topPub!.publishedAt as string))}</p>
                      <p className="text-xs font-semibold text-foreground">{formatBRL(topPub!.revenue ?? 0)}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

function ResumoItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-base font-bold">{value}</p>
      </div>
    </div>
  );
}

function EngajamentoChart({
  loading, totalLabel, totalRevenue, range, items,
  metricLabel = "Faturamento", metricFormat = "brl",
}: {
  loading: boolean;
  totalLabel: string;
  totalRevenue: number;
  range: { from: string; to: string };
  items: { date: string; metric: number }[];
  metricLabel?: string;
  metricFormat?: "brl" | "int";
}) {
  const data = useMemo(() => {
    const byDay = new Map<string, { metric: number; count: number }>();
    for (const it of items) {
      if (!it.date) continue;
      const key = new Date(it.date).toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? { metric: 0, count: 0 };
      cur.metric += it.metric || 0;
      cur.count += 1;
      byDay.set(key, cur);
    }
    const out: { date: string; label: string; metric: number; count: number }[] = [];
    const from = new Date(range.from);
    const to = new Date(range.to);
    const d = new Date(from);
    while (d <= to) {
      const key = d.toISOString().slice(0, 10);
      const v = byDay.get(key) ?? { metric: 0, count: 0 };
      out.push({
        date: key,
        label: `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
        metric: v.metric,
        count: v.count,
      });
      d.setUTCDate(d.getUTCDate() + 1);
      if (out.length > 400) break;
    }
    return out;
  }, [items, range.from, range.to]);

  const formatMetric = (v: number) => metricFormat === "brl" ? formatBRL(v) : String(Math.round(v));

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="text-base font-bold">{totalLabel}</span>
          <span className="text-base font-bold">{formatBRL(totalRevenue)}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" />{metricLabel}</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/60" />Quantidade</span>
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : items.length === 0 ? (
        <p className="mt-8 py-16 text-center text-sm text-muted-foreground">Sem dados de engajamento para o período selecionado.</p>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} stroke="var(--border)" />
              <YAxis yAxisId="left" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} stroke="var(--border)" tickFormatter={(v) => formatMetric(v as number)} width={metricFormat === "brl" ? 80 : 48} allowDecimals={metricFormat === "brl"} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} stroke="var(--border)" allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" }}
                formatter={(value: number, name: string) => name === metricLabel ? [formatMetric(value), name] : [value, name]}
                labelFormatter={(l) => `Data: ${l}`}
              />
              <Bar yAxisId="right" dataKey="count" name="Quantidade" fill="color-mix(in oklab, var(--muted-foreground) 50%, transparent)" radius={[4, 4, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="metric" name={metricLabel} stroke="var(--primary)" strokeWidth={2} dot={{ r: 3, fill: "var(--primary)" }} />

            </ComposedChart>
          </ResponsiveContainer>

        </div>
      )}
    </>
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
                    <Line type="monotone" dataKey="visits" name="Visitantes" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="users" name="Usuários" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 text-sm text-muted-foreground border-b border-border pb-3">
              <span />
              <span className="text-right">Visitantes</span>
              <span className="text-right">Usuários</span>
              <span className="text-right">Total</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 items-center pt-4 text-sm">
              <span className="text-foreground">Visitantes do perfil</span>
              <span className="text-right">{data?.profileViews ?? 0}</span>
              <span className="text-right">{data?.profileUniqueViewers ?? 0}</span>
              <span className="text-right font-bold">{(data?.profileViews ?? 0) + (data?.profileUniqueViewers ?? 0)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-bold mb-4">Principais países</h3>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 text-sm text-muted-foreground border-b border-border pb-3">
              <span>País</span>
              <span className="text-right">Visitantes</span>
              <span className="text-right">Usuários</span>
              <span className="text-right">Total</span>
            </div>
            {isLoading ? (
              <Skeleton className="mt-4 h-8 w-full" />
            ) : (data?.topCountries ?? []).length === 0 ? (
              <p className="pt-4 text-sm text-muted-foreground">Nenhum país registrado no período.</p>
            ) : (
              (data?.topCountries ?? []).map((c, i) => (
                <div key={c.country ?? `unk-${i}`} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-8 items-center pt-4 text-sm">
                  <span className="flex items-center gap-2 text-foreground">
                    <span className="text-lg leading-none">{countryFlag(c.country)}</span>
                    <span>{countryName(c.country)}</span>
                  </span>
                  <span className="text-right">{c.visits}</span>
                  <span className="text-right">{c.users}</span>
                  <span className="text-right font-bold">{c.visits + c.users}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-bold">Resumo</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <ResumoItem icon={Users} label="Visitantes" value={String(data?.profileViews ?? 0)} />
              <ResumoItem icon={UserPlus} label="Assinaturas" value={String(data?.subscriptionsCount ?? 0)} />
              <ResumoItem icon={DollarSign} label="Assinaturas" value={formatBRL(data?.subscriptionsRevenueCents ?? 0)} />
              <ResumoItem icon={RefreshCw} label="Renovações" value={String(data?.renewalsCount ?? 0)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function countryFlag(iso: string | null): string {
  if (!iso || iso.length !== 2) return "🌐";
  const cc = iso.toUpperCase();
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl
  ? new Intl.DisplayNames(["pt-BR"], { type: "region" })
  : null;

function countryName(iso: string | null): string {
  if (!iso) return "Desconhecido";
  try {
    return regionNames?.of(iso.toUpperCase()) ?? iso.toUpperCase();
  } catch {
    return iso.toUpperCase();
  }
}


/* ============================== Assinantes ============================== */

const ASSINANTES_TABS = ["Assinaturas", "Top assinantes", "Atividade dos assinantes"] as const;
const TOP_ASSINANTES_CHIPS = ["Total", "Assinaturas", "Mimos", "Chat"] as const;
const TOP_METRIC_MAP: Record<(typeof TOP_ASSINANTES_CHIPS)[number], "total"|"subscription"|"tip"|"chat_unlock"> = {
  Total: "total", Assinaturas: "subscription", Mimos: "tip", Chat: "chat_unlock",
};

const chartDate = new Intl.DateTimeFormat("pt-BR", { month: "short", day: "numeric", year: "numeric" });
function formatChartDate(iso: string) {
  const parts = chartDate.format(new Date(iso)).replace(".", "").split(" de ");
  // pt-BR "17 de jul. de 2026" -> ["17", "jul", "2026"]
  if (parts.length === 3) return `${parts[1]} ${parts[0]},\n${parts[2]}`;
  return chartDate.format(new Date(iso));
}

function AssinantesPanel({ range }: { range: { from: string; to: string } }) {
  const [tab, setTab] = useState<(typeof ASSINANTES_TABS)[number]>("Assinaturas");
  const [topFiltro, setTopFiltro] = useState<(typeof TOP_ASSINANTES_CHIPS)[number]>("Total");
  const [gastoFiltro, setGastoFiltro] = useState<(typeof TOP_ASSINANTES_CHIPS)[number]>("Total");

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
  const gasto = useQuery({
    queryKey: ["stats", "topAssinantesGasto", range.from, range.to, gastoFiltro],
    queryFn: () => topFn({ data: { ...range, metric: TOP_METRIC_MAP[gastoFiltro] } }),
    staleTime: 30_000,
  });


  const chart = (stats.data?.daily ?? []).map(r => ({
    label: formatChartDate(r.day),
    faturamento: (r.gross ?? 0) / 100,
    quantidade: (r.novos ?? 0) + (r.renovacoes ?? 0),
  }));
  const totalAssinantes = (stats.data?.novosPeriodo ?? 0) + (stats.data?.renovacoesPeriodo ?? 0);

  return (
    <div className="space-y-5">
      <SubTabsRow tabs={ASSINANTES_TABS} active={tab} onChange={setTab} />

      <div className="border-t border-border pt-5">
        {tab === "Assinaturas" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-bold">
                    {totalAssinantes} Assinantes, {formatBRL(stats.data?.faturamentoPeriodo ?? 0)}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#8B5CF6" }} />Faturamento</span>
                    <span className="inline-flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/70" />Quantidade</span>
                  </div>
                </div>
                <div className="relative mt-6 h-72">
                  {stats.isLoading ? <Skeleton className="h-full w-full" /> : (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chart.length ? chart : [{ label: "", faturamento: 0, quantidade: 0 }]} margin={{ top: 10, right: 12, bottom: 10, left: 0 }}>
                          <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" tickLine={false} axisLine={false} height={44} />
                          <YAxis yAxisId="left" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={44} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={28} tickLine={false} axisLine={false} />
                          <Tooltip
                            formatter={(v: number, name) => name === "Faturamento" ? formatBRL(Number(v) * 100) : String(v)}
                            labelFormatter={(l) => String(l).replace("\n", " ")}
                          />
                          <Line yAxisId="left" type="monotone" dataKey="faturamento" name="Faturamento" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3, fill: "#8B5CF6" }} activeDot={{ r: 5 }} />
                          <Line yAxisId="right" type="monotone" dataKey="quantidade" name="Quantidade" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                      {chart.length === 0 && (
                        <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                          Nenhum dado disponível para o período.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <AssinantesListInline range={range} />

            </div>
            <div className="space-y-5">
              <TopAssinantesInline top={top.data ?? []} loading={top.isLoading} filtro={topFiltro} onFiltro={setTopFiltro} />
            </div>
          </div>
        ) : tab === "Top assinantes" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <TopAssinantesGastoTotal top={gasto.data ?? []} loading={gasto.isLoading} filtro={gastoFiltro} onFiltro={setGastoFiltro} />
            </div>
            <div className="space-y-5">
              <ResumoAssinantesCard stats={stats.data} loading={stats.isLoading} />
              <TopAssinantesInline top={top.data ?? []} loading={top.isLoading} filtro={topFiltro} onFiltro={setTopFiltro} />
            </div>
          </div>

        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-5">
              <AtividadeHeatmapCard range={range} />
              <HorasMaisAtivasCard range={range} />
            </div>
            <div className="space-y-5">
              <ResumoAssinantesCard stats={stats.data} loading={stats.isLoading} />
              <TopAssinantesInline top={top.data ?? []} loading={top.isLoading} filtro={topFiltro} onFiltro={setTopFiltro} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const HEATMAP_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const HEATMAP_HOURS = ["12am", "3am", "6am", "9am", "12pm", "3pm", "6pm", "9pm"] as const;

function useAssinantesActivity(range: { from: string; to: string }) {
  const fn = useServerFn(getAssinantesActivity);
  return useQuery({
    queryKey: ["stats", "assinantesActivity", range.from, range.to],
    queryFn: () => fn({ data: range }),
    staleTime: 30_000,
  });
}

function AtividadeHeatmapCard({ range }: { range: { from: string; to: string } }) {
  const q = useAssinantesActivity(range);
  const heatmap = q.data?.heatmap ?? Array.from({ length: 7 }, () => Array(8).fill(0));
  const max = q.data?.max ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-bold">Atividade dos assinantes</h3>
      <p className="mt-1 text-sm text-muted-foreground">Distribuição de acessos dos assinantes por dia e horário</p>
      <div className="mt-5">
        {q.isLoading ? (
          <div className="grid grid-cols-[auto_repeat(8,minmax(0,1fr))] gap-1.5">
            {HEATMAP_DAYS.map(d => (
              <Fragment key={d}>
                <span className="text-xs text-muted-foreground pr-2 self-center">{d}</span>
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-md" />)}
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[auto_repeat(8,minmax(0,1fr))] gap-1.5">
            {HEATMAP_DAYS.map((day, di) => (
              <Fragment key={day}>
                <span className="text-xs text-muted-foreground pr-2 self-center">{day}</span>
                {heatmap[di].map((count, bi) => {
                  const opacity = max > 0 ? 0.08 + (count / max) * 0.72 : 0.08;
                  return (
                    <div
                      key={bi}
                      className="h-8 rounded-md"
                      style={{ background: `hsl(var(--primary) / ${opacity})` }}
                      title={`${count} ${count === 1 ? "acesso" : "acessos"}`}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        )}
        <div className="mt-2 grid grid-cols-[auto_repeat(8,minmax(0,1fr))] gap-1.5">
          <span />
          {HEATMAP_HOURS.map(h => (
            <span key={h} className="text-xs text-muted-foreground text-center">{h}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HorasMaisAtivasCard({ range }: { range: { from: string; to: string } }) {
  const q = useAssinantesActivity(range);
  const data = HEATMAP_HOURS.map((label, i) => ({ label, pct: q.data?.hourlyPct[i] ?? 0 }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-bold">Horas mais ativas</h3>
      <div className="mt-4 h-56">
        {q.isLoading ? <Skeleton className="h-full w-full" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="horasFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 33, 66, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={40} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Area type="monotone" dataKey="pct" stroke="#8B5CF6" strokeWidth={2} fill="url(#horasFill)" />
            </AreaChart>
          </ResponsiveContainer>
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
      <div className="mt-3">
        <CardTabsRow tabs={TOP_ASSINANTES_CHIPS} active={filtro} onChange={onFiltro} />
      </div>
      {loading ? <Skeleton className="mt-4 h-32 w-full" /> :
        top.length === 0 ? <p className="mt-6 text-center text-sm text-muted-foreground">Sem dados para este filtro.</p> :
        <div className={`mt-4 ${full ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-3"}`}>
          {top.map((t, i) => (
            <div key={t.buyerId} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <span className="font-bold text-muted-foreground w-6">#{i + 1}</span>
              {t.avatarUrl ? <img src={t.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> :
                <div className="h-9 w-9 rounded-full bg-muted grid place-items-center"><Users className="h-4 w-4 text-muted-foreground" /></div>}
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

function TopAssinantesGastoTotal({ top, loading, filtro, onFiltro }: {
  top: { buyerId: string; gross: number; username: string | null; displayName: string | null; avatarUrl: string | null }[];
  loading: boolean;
  filtro: (typeof TOP_ASSINANTES_CHIPS)[number];
  onFiltro: (f: (typeof TOP_ASSINANTES_CHIPS)[number]) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <div>
        <h3 className="text-sm font-bold">Filtrar por</h3>
        <div className="mt-3">
          <CardTabsRow tabs={TOP_ASSINANTES_CHIPS} active={filtro} onChange={onFiltro} />
        </div>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_auto] gap-3 px-4 py-3 text-xs font-semibold text-muted-foreground border-b border-border">
          <span>Nome</span>
          <span className="text-right">Gasto total</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : top.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Sem dados para este filtro</div>
        ) : (
          <div className="divide-y divide-border">
            {top.map(t => {
              const name = t.displayName || t.username || "Assinante";
              return (
                <div key={t.buyerId} className="grid grid-cols-[minmax(0,2fr)_auto] gap-3 items-center px-4 py-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                      {t.avatarUrl ? <img src={t.avatarUrl} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{name}</p>
                      {t.username && <p className="text-xs text-muted-foreground truncate">@{t.username}</p>}
                    </div>
                  </div>
                  <span className="justify-self-end font-semibold whitespace-nowrap">{formatBRL(t.gross)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ResumoAssinantesCard({ stats, loading }: {
  stats: { novosPeriodo: number; renovacoesPeriodo: number; faturamentoPeriodo: number } | undefined;
  loading: boolean;
}) {
  const novos = stats?.novosPeriodo ?? 0;
  const renov = stats?.renovacoesPeriodo ?? 0;
  const totalAssin = novos + renov;
  const items = [
    { icon: Users, label: "Assinantes", value: loading ? "—" : String(totalAssin) },
    { icon: UserPlus, label: "Assinaturas/Renovações", value: loading ? "—" : `${novos} / ${renov}` },
    { icon: DollarSign, label: "Ganhos de assinaturas", value: loading ? "—" : formatBRL(stats?.faturamentoPeriodo ?? 0) },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-bold">Resumo</h3>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className="text-base font-bold truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>
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

const ASSINANTES_LIST_CHIPS = ["Todos", "Renovações", "Novos assinantes"] as const;
type AssinantesListFilter = (typeof ASSINANTES_LIST_CHIPS)[number];
const LIST_FILTER_MAP: Record<AssinantesListFilter, "todos" | "renovacoes" | "novos"> = {
  "Todos": "todos",
  "Renovações": "renovacoes",
  "Novos assinantes": "novos",
};

function formatDuration(days: number): string {
  if (days < 30) return `${days} ${days === 1 ? "dia" : "dias"}`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "mês" : "meses"}`;
}

function AssinantesListInline({ range }: { range: { from: string; to: string } }) {
  const fn = useServerFn(getAssinantesList);
  const [filter, setFilter] = useState<AssinantesListFilter>("Todos");
  const [query, setQuery] = useState("");
  const deferredQ = useDeferredValue(query);

  const q = useQuery({
    queryKey: ["stats", "assinantesList", range.from, range.to, LIST_FILTER_MAP[filter], deferredQ.trim()],
    queryFn: () => fn({ data: { from: range.from, to: range.to, filter: LIST_FILTER_MAP[filter], q: deferredQ.trim() } }),
    staleTime: 30_000,
  });

  const rows = q.data ?? [];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <div>
        <h3 className="text-sm font-bold">Filtrar por</h3>
        <div className="mt-3">
          <CardTabsRow tabs={ASSINANTES_LIST_CHIPS} active={filter} onChange={setFilter} />
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar assinantes..."
          className="h-11 rounded-full pl-11"
        />
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_auto_auto_auto] gap-3 px-4 py-3 text-xs font-semibold text-muted-foreground border-b border-border">
          <span>Nome</span>
          <span className="text-right">Status</span>
          <span className="text-right">Preço</span>
          <span className="text-right">Duração total</span>
        </div>
        {q.isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Nenhum assinante encontrado.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map(r => {
              const name = r.displayName || r.username || "Assinante";
              const active = r.statusLabel === "Ativo";
              return (
                <div key={r.id} className="grid grid-cols-[minmax(0,2fr)_auto_auto_auto] gap-3 items-center px-4 py-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                      {r.avatarUrl ? <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{name}</p>
                      {r.username && <p className="text-xs text-muted-foreground truncate">@{r.username}</p>}
                    </div>
                  </div>
                  <span className={`justify-self-end rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {r.statusLabel}
                  </span>
                  <span className="justify-self-end font-semibold whitespace-nowrap">{formatBRL(r.priceCents)}</span>
                  <span className="justify-self-end text-muted-foreground whitespace-nowrap">{formatDuration(r.durationDays)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


/* ============================== Destaques ============================== */

function DestaquesPanel({ range }: { range: { from: string; to: string } }) {
  return (
    <div className="space-y-5">
      <TopPostagemCard range={range} />
      <TopLiveCard range={range} />
      <TopAssinantesCard range={range} />
    </div>
  );
}

const TOP_POST_TABS = ["Mais vendida", "Mimos", "Curtidas", "Comentários"] as const;
const TOP_POST_SORT: Record<(typeof TOP_POST_TABS)[number], "revenue" | "tips" | "likes" | "comments"> = {
  "Mais vendida": "revenue", "Mimos": "tips", "Curtidas": "likes", "Comentários": "comments",
};

type PostAction = "stats" | "copy" | "pin" | "archive";

function TopPostagemCard({ range }: { range: { from: string; to: string } }) {
  const [tab, setTab] = useState<(typeof TOP_POST_TABS)[number]>("Mais vendida");
  const [action, setAction] = useState<PostAction | null>(null);
  const [checked, setChecked] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const fn = useServerFn(getEngajamentoPublicacoes);
  const pinFn = useServerFn(setPublicationPinned);
  const archiveFn = useServerFn(setPublicationArchived);
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["stats", "destaquesPub", range.from, range.to, tab],
    queryFn: () => fn({ data: { ...range, sort: TOP_POST_SORT[tab] } }),
    staleTime: 30_000,
  });
  const top = q.data?.items?.[0];
  const authorUsername = q.data?.authorUsername ?? null;

  const chooseAction = (a: PostAction) => {
    setAction(a);
    setChecked(false);
  };
  const cancelAction = () => { setAction(null); setChecked(false); };

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!top || !action) return;
      if (action === "stats") { setStatsOpen(true); return; }
      if (action === "copy") {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = authorUsername ? `${origin}/perfil/${authorUsername}` : origin;
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado");
        return;
      }
      if (action === "pin") {
        await pinFn({ data: { id: top.id, pinned: !top.pinned } });
        toast.success(top.pinned ? "Post desafixado" : "Post fixado");
        return;
      }
      if (action === "archive") {
        await archiveFn({ data: { id: top.id, archived: true } });
        toast.success("Post arquivado");
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (action === "archive" || action === "pin") {
        queryClient.invalidateQueries({ queryKey: ["archived-posts"] });
        queryClient.invalidateQueries({ queryKey: ["publications"] });
      }
      if (action !== "stats") cancelAction();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Falha ao aplicar ação");
    },
  });

  const pinLabel = top?.pinned ? "Desafixar post" : "Fixar post";
  const actionLabel: Record<PostAction, string> = {
    stats: "Exibir estatísticas", copy: "Copiar link da publicação",
    pin: pinLabel, archive: "Arquivar post",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /><h3 className="text-lg font-bold">Top postagem</h3></div>
        <CardMenu items={[
          { label: "Exibir estatísticas", onSelect: () => chooseAction("stats") },
          { label: "Copiar link da publicação", onSelect: () => chooseAction("copy") },
          { label: pinLabel, onSelect: () => chooseAction("pin") },
          { label: "Arquivar post", onSelect: () => chooseAction("archive") },
        ]} />
      </div>
      <div className="mt-4">
        <CardTabsRow tabs={TOP_POST_TABS} active={tab} onChange={setTab} />
      </div>
      {action && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2 text-sm">
          <span className="font-medium text-primary">Ação: {actionLabel[action]}</span>
          <button type="button" onClick={cancelAction} className="text-xs font-medium text-muted-foreground hover:text-foreground">Cancelar</button>
        </div>
      )}
      {q.isLoading ? <Skeleton className="mt-4 h-16 w-full" /> :
        !top ? <p className="mt-6 text-center text-sm text-muted-foreground">Nenhuma postagem encontrada no período.</p> : (
          <Link to="/feed" className="relative mt-4 block rounded-xl bg-muted/50 p-4">
            {action && (
              <span
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="absolute right-3 top-3"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => setChecked(!!v)}
                  aria-label="Selecionar postagem"
                />
              </span>
            )}
            <div className="flex items-start gap-3">
              {top.previewUrl ? (
                <img
                  src={top.previewUrl}
                  alt="Miniatura da postagem"
                  className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-lg bg-muted">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">
                  {top.pinned && <span className="mr-1 inline-block rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">fixado</span>}
                  {top.caption || "(sem legenda)"}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>{fullDate.format(new Date(top.publishedAt as string))}</span>
                  <span>{top.likes} curtidas</span>
                  <span>{top.comments} coment.</span>
                  <span>{top.tips} mimos</span>
                  <span className="font-semibold text-foreground">{formatBRL(top.revenue)}</span>
                </div>
              </div>
            </div>
          </Link>
        )}
      {action && top && (
        <div className="mt-4">
          <Button
            className="w-full"
            size="sm"
            disabled={!checked || applyMutation.isPending}
            onClick={() => applyMutation.mutate()}
          >
            {applyMutation.isPending ? "Aplicando…" : "Aplicar"}
          </Button>
        </div>
      )}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estatísticas da postagem</DialogTitle>
          </DialogHeader>
          {top && (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{top.caption || "(sem legenda)"}</p>
              <p className="text-muted-foreground text-xs">{fullDate.format(new Date(top.publishedAt as string))}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Curtidas</p><p className="text-lg font-bold">{top.likes}</p></div>
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Comentários</p><p className="text-lg font-bold">{top.comments}</p></div>
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Mimos</p><p className="text-lg font-bold">{top.tips}</p></div>
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Faturamento</p><p className="text-lg font-bold">{formatBRL(top.revenue)}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


const TOP_LIVE_TABS = ["Mais vendida", "Mimos"] as const;
const TOP_LIVE_SORT: Record<(typeof TOP_LIVE_TABS)[number], "revenue" | "tips"> = {
  "Mais vendida": "revenue", "Mimos": "tips",
};

function TopLiveCard({ range }: { range: { from: string; to: string } }) {
  const [tab, setTab] = useState<(typeof TOP_LIVE_TABS)[number]>("Mais vendida");
  const [statsOpen, setStatsOpen] = useState(false);
  const fn = useServerFn(getEngajamentoLives);
  const q = useQuery({
    queryKey: ["stats", "destaquesLive", range.from, range.to, tab],
    queryFn: () => fn({ data: { ...range, sort: TOP_LIVE_SORT[tab] } }),
    staleTime: 30_000,
  });
  const top = q.data?.items?.[0];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2"><Radio className="h-5 w-5 text-primary" /><h3 className="text-lg font-bold">Top Live</h3></div>
        <CardMenu items={[
          { label: "Exibir estatísticas", onSelect: () => setStatsOpen(true), disabled: !top },
        ]} />
      </div>
      <div className="mt-4">
        <CardTabsRow tabs={TOP_LIVE_TABS} active={tab} onChange={setTab} />
      </div>
      {q.isLoading ? <Skeleton className="mt-4 h-16 w-full" /> :
        !top ? <p className="mt-6 text-center text-sm text-muted-foreground">Nenhuma live no período.</p> : (
          <div className="mt-4 rounded-xl bg-muted/50 p-4">
            <p className="font-semibold truncate">{top.title ?? "Live"}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>{fullDate.format(new Date(top.started_at as string))}</span>
              <span>{top.total_views ?? 0} views</span>
              <span className="font-semibold text-foreground">{formatBRL(top.gross_cents ?? 0)}</span>
            </div>
          </div>
        )}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estatísticas da live</DialogTitle>
          </DialogHeader>
          {top && (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{top.title ?? "Live"}</p>
              <p className="text-muted-foreground text-xs">{fullDate.format(new Date(top.started_at as string))}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Views</p><p className="text-lg font-bold">{top.total_views ?? 0}</p></div>
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Faturamento</p><p className="text-lg font-bold">{formatBRL(top.gross_cents ?? 0)}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


const TOP_ASSIN_TABS = ["Total", "Mais assinaturas", "Mimos", "Chat"] as const;
const TOP_ASSIN_METRIC: Record<(typeof TOP_ASSIN_TABS)[number], "total" | "subscription" | "tip" | "chat_unlock"> = {
  "Total": "total", "Mais assinaturas": "subscription", "Mimos": "tip", "Chat": "chat_unlock",
};

function TopAssinantesCard({ range }: { range: { from: string; to: string } }) {
  const [tab, setTab] = useState<(typeof TOP_ASSIN_TABS)[number]>("Total");
  const fn = useServerFn(getTopAssinantes);
  const q = useQuery({
    queryKey: ["stats", "destaquesTop", range.from, range.to, tab],
    queryFn: () => fn({ data: { ...range, metric: TOP_ASSIN_METRIC[tab] } }),
    staleTime: 30_000,
  });
  const items = q.data ?? [];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h3 className="text-lg font-bold">Top assinantes</h3></div>
      <div className="mt-4">
        <CardTabsRow tabs={TOP_ASSIN_TABS} active={tab} onChange={setTab} />
      </div>
      {q.isLoading ? <Skeleton className="mt-4 h-32 w-full" /> :
        items.length === 0 ? <p className="mt-6 text-center text-sm text-muted-foreground">Sem dados no período.</p> : (
          <div className="mt-4 space-y-2">
            {items.slice(0, 5).map((t, i) => (
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

/* ============================== Superfãs ============================== */

function SuperfasPanel() {
  const listFn = useServerFn(listMyIncomingFriends);
  const toggleFn = useServerFn(setFriendshipVisibility);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);

  const { data, isLoading } = useQuery({
    queryKey: ["friends", "incoming", deferredQ],
    queryFn: () => listFn({ data: { search: deferredQ, limit: 200 } }),
  });

  const toggle = useMutation({
    mutationFn: (vars: { friendshipId: string; visible: boolean }) =>
      toggleFn({ data: vars }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["friends", "incoming"] });
      void qc.invalidateQueries({ queryKey: ["friends", "public"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar"),
  });

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-background p-5 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Superfãs — quem te adicionou</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Outros criadores e assinantes que te adicionaram como amigo. Ótimo
          para acompanhar oportunidades de cross-promotion. Você pode ocultar
          individualmente sua exibição pública em cada perfil.
        </p>
        <div className="text-xs text-muted-foreground">
          Para ocultar-se globalmente de todas as listas de amigos, ative a opção
          em{" "}
          <Link to="/settings/privacy-options" className="text-primary font-semibold hover:underline">
            Privacidade
          </Link>
          .
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-background p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar superfãs..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Ninguém te adicionou como amigo ainda.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.friendshipId} className="flex items-center gap-3 py-3">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-700 grid place-items-center text-white font-bold shrink-0">
                  {r.avatarUrl ? (
                    <img src={r.avatarUrl} alt={r.displayName ?? r.username} className="h-full w-full object-cover" />
                  ) : (
                    <span>{(r.displayName ?? r.username).slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {r.displayName ?? r.username}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{r.username} · desde {fullDate.format(new Date(r.createdAt))}
                  </div>
                </div>
                <Link
                  to="/perfil/$username"
                  params={{ username: r.username }}
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  Ver perfil
                </Link>
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {r.visible ? "Visível" : "Oculto"}
                  </span>
                  <Switch
                    checked={r.visible}
                    disabled={toggle.isPending}
                    onCheckedChange={(checked) =>
                      toggle.mutate({ friendshipId: r.friendshipId, visible: checked })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
