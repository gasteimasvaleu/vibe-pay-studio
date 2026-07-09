import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  Info,
  Lock,
  MessageCircle,
  MoreVertical,
  Radio,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  Minus,
  ArrowUp,
  ExternalLink,
  ChevronDown,
  Image as ImageIcon,
  DollarSign,
  Eye,
  UserPlus,
  Search,
} from "lucide-react";





export const Route = createFileRoute("/_authenticated/my-monetisex-stats")({
  head: () => ({
    meta: [
      { title: "Meu Monetisex · Monetisex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyMonetisexStatsPage,
});

const MAIN_TABS = ["Visão geral", "Extratos", "Engajamento", "Alcance", "Assinantes"] as const;
const SUB_TABS = ["Faturamento", "Destaques", "Sequência de atividades", "Resumo"] as const;

function MyMonetisexStatsPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<(typeof MAIN_TABS)[number]>("Visão geral");
  const [subTab, setSubTab] = useState<(typeof SUB_TABS)[number]>("Faturamento");

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{ background: "var(--gradient-radial)" }}
      />

      <header className="sticky top-0 z-20 border-b border-border backdrop-blur-md bg-card/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">Meu Monetisex</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <RangeSelector />

        <div className="space-y-3">
          <TabsRow tabs={MAIN_TABS} active={mainTab} onChange={setMainTab} />
          {mainTab === "Visão geral" && (
            <SubTabsRow tabs={SUB_TABS} active={subTab} onChange={setSubTab} />
          )}
        </div>

        {mainTab === "Extratos" ? (
          <ExtratosPanel />
        ) : mainTab === "Engajamento" ? (
          <EngajamentoPanel />
        ) : mainTab === "Alcance" ? (
          <AlcancePanel />
        ) : mainTab === "Assinantes" ? (
          <AssinantesPanel />
        ) : subTab === "Resumo" ? (

          <ResumoPanel />

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-5">
              {subTab === "Destaques" ? (
                <DestaquesPanel />
              ) : subTab === "Sequência de atividades" ? (
                <SequenciaPanel />
              ) : (
                <>
                  <EarningsChartCard />
                  <ProductTable />
                </>
              )}
            </div>
            <div className="space-y-5">
              <TopBadgeCard />
              <PeriodTotalCard />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
        active
          ? "bg-primary/15 text-primary border-primary/30"
          : "bg-card text-muted-foreground border-border hover:text-foreground"
      }`}
    >
      {label}
    </button>
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
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-56 rounded-2xl border-border bg-popover text-popover-foreground shadow-lg p-2"
      >
        {items.map((it) => (
          <DropdownMenuItem
            key={it.label}
            onSelect={it.onSelect}
            className="py-3 px-3 text-base cursor-pointer rounded-xl"
          >
            {it.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DestaquesPanel() {
  return (
    <div className="space-y-5">
      <TopPostagemCard />
      <TopLiveCard />
      <TopAssinantesCard />
    </div>
  );
}

function TopPostagemCard() {
  const filters = ["Mais vendida", "Mimos", "Curtidas", "Comentários"] as const;
  const [active, setActive] = useState<(typeof filters)[number]>("Mais vendida");
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold tracking-tight">Top postagem</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Chip key={f} label={f} active={f === active} onClick={() => setActive(f)} />
            ))}
          </div>
        </div>
        <CardMenu
          items={[
            { label: "Exibir estatísticas" },
            { label: "Copiar link da publicação" },
            { label: "Fixar post" },
            { label: "Arquivar post" },
          ]}
        />
      </div>
      <p className="mt-10 mb-6 text-center text-sm text-muted-foreground">
        Nenhuma postagem encontrada no período.
      </p>
    </div>
  );
}

function TopLiveCard() {
  const filters = ["Mais vendida", "Mimos"] as const;
  const [active, setActive] = useState<(typeof filters)[number]>("Mais vendida");
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold tracking-tight">Top Live</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Chip key={f} label={f} active={f === active} onClick={() => setActive(f)} />
            ))}
          </div>
        </div>
        <CardMenu items={[{ label: "Exibir estatísticas" }]} />
      </div>

      <div className="mt-4 h-px bg-border" />

      <div className="mt-4 flex items-center gap-4">
        <div className="h-32 w-32 rounded-xl bg-muted grid place-items-center">
          <Radio className="h-12 w-12 text-primary" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-muted-foreground text-sm">
          <Lock className="h-4 w-4" />
          <span>—</span>
        </div>
      </div>
    </div>
  );
}

function TopAssinantesCard() {
  const filters = ["Total", "Mais assinaturas", "Mimos", "Chat"] as const;
  const [active, setActive] = useState<(typeof filters)[number]>("Total");
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold tracking-tight">Top assinantes</h3>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Chip key={f} label={f} active={f === active} onClick={() => setActive(f)} />
        ))}
      </div>
      <p className="mt-10 mb-6 text-center text-sm text-muted-foreground">
        Sem dados para este filtro.
      </p>
    </div>
  );
}

function RangeSelector() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-foreground">
        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold">Últimos 30 dias</span>
      </div>
      <button
        type="button"
        className="px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground hover:bg-accent transition-colors"
      >
        Jun 9, 2026 - Jul 9, 2026
      </button>
    </div>
  );
}

function TabsRow<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="rounded-full border border-border bg-card p-1 flex overflow-x-auto">
      {tabs.map((t) => {
        const isActive = t === active;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`flex-1 min-w-fit whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function SubTabsRow<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const isActive = t === active;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              isActive
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function EarningsChartCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-bold tracking-tight">Últimos 30 dias</h3>
        <span className="text-lg font-bold">R$ 0,00</span>
      </div>

      <div className="mt-6 relative h-40">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-8">R$0</span>
              <div className="flex-1 border-t border-dashed border-border" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-between text-xs text-muted-foreground pl-11">
        <span>Jun 9,<br />2026</span>
        <span>Jun 16,<br />2026</span>
        <span>Jun 24,<br />2026</span>
        <span>Jul 2,<br />2026</span>
        <span>Jul 9,<br />2026</span>
      </div>
    </div>
  );
}

function ProductTable() {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="grid grid-cols-3 px-5 py-3 text-sm text-muted-foreground border-b border-border">
        <span>Produto</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Sua comissão</span>
      </div>
      <div className="grid grid-cols-3 px-5 py-4 items-center">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Total
        </div>
        <span className="text-right">R$ 0,00</span>
        <span className="text-right">R$ 0,00</span>
      </div>
    </div>
  );
}

function TopBadgeCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/15 text-primary grid place-items-center">
          <MessageCircle className="h-5 w-5" />
        </div>
        <span className="font-semibold">Você está no top +100 da Monetisex!</span>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Faturamento hoje</p>
        <div className="mt-2 h-0.5 w-8 bg-foreground/60 rounded-full" />
      </div>

      <div className="rounded-xl border border-border bg-background/40 grid grid-cols-2 divide-x divide-border">
        <div className="p-4">
          <p className="text-lg font-bold">R$ 0,00</p>
          <p className="text-xs text-muted-foreground mt-1">Saldo liberado</p>
        </div>
        <div className="p-4">
          <p className="text-lg font-bold">R$ 0,00</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            Saldo a liberar <Info className="h-3 w-3" />
          </p>
        </div>
      </div>

      <Link
        to="/dashboard"
        className="block text-center rounded-full border border-border py-3 text-sm font-semibold hover:bg-accent transition-colors"
      >
        Acessar Meu Banco
      </Link>
    </div>
  );
}

function PeriodTotalCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-bold">Faturamento no período</h3>
      <p className="mt-3 text-sm text-muted-foreground">R$ 0,00</p>
    </div>
  );
}

function SequenciaPanel() {
  return (
    <div className="space-y-5">
      <StreakCallout />
      <StreakStatsRow />
      <StreakDetailCard />
      <StreakCalendarCard />
    </div>
  );
}

function StreakCalendarCard() {
  const day = new Date(2026, 6, 9);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <Calendar
        mode="single"
        selected={day}
        defaultMonth={day}
        showOutsideDays={false}
        className="p-3 pointer-events-auto w-full [--cell-size:1.5rem]"
        classNames={{
          weekdays: "grid grid-cols-7 gap-2",
          weekday:
            "text-muted-foreground select-none text-[0.8rem] font-normal text-center",
          week: "mt-2 grid grid-cols-7 gap-2",
          day: "group/day relative aspect-square w-(--cell-size) h-(--cell-size) mx-auto select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
        }}
      />
    </div>
  );
}

function StreakCallout() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] flex items-center gap-3">
      <Trophy className="h-5 w-5 text-primary shrink-0" />
      <p className="flex-1 font-semibold">Poste e divulgue para continuar crescendo!</p>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Sobre sequências"
            className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Info className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="max-w-xs bg-foreground text-background border-foreground text-sm leading-relaxed rounded-xl p-4"
        >
          Uma sequência é o número de dias seguidos em que você esteve ativo para seus
          seguidores. Depois de concluir uma ação, sua sequência aumentará em um dia. Você
          pode descansar por um dia consecutivo, mas apenas uma vez por semana sem perder
          sua sequência. Durante esse dia de folga, sua sequência será pausada e retomada
          no dia seguinte, quando você se tornar ativo novamente.
        </PopoverContent>
      </Popover>
    </div>
  );
}

function StreakStatsRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="rounded-2xl border-2 border-primary bg-card p-5 shadow-[var(--shadow-card)] text-center">
        <p className="text-sm text-muted-foreground">Sequência atual</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-2xl font-bold text-primary">1 dia</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] text-center">
        <p className="text-sm text-muted-foreground">Sequência mais longa</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          <span className="text-2xl font-bold">1 dia</span>
        </div>
      </div>
    </div>
  );
}

function StreakDetailCard() {
  const rows: { label: string; value: string }[] = [
    { label: "Postagens feitas", value: "1" },
    { label: "Respostas aos assinantes no chat", value: "Não" },
    { label: "Tempo em live", value: "0m" },
    { label: "Faturamento total", value: "R$ 0,00" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-bold">Sua sequência atual começou. 9 Jul, 2026</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Durante esse período, você esteve ativo por 1 dia, com:
      </p>
      <div className="mt-4">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-4 border-t border-border"
          >
            <span className="text-foreground">{r.label}</span>
            <span className="font-semibold">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumoPanel() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <VendasCard title="Vendas nacionais" />
        <VendasCard title="Vendas internacionais" />
        <MeuBancoCard />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <AssinantesCard />
        <ProjecaoFaturamentoCard />
        <PeriodTotalCard />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <RecordeCard title="Recorde de vendas no dia" />
        <RecordeCard title="Recorde de vendas no mês" />
      </div>
    </div>
  );
}

function VendasCard({ title }: { title: string }) {
  const rows = [
    { label: "Hoje", value: "R$ 0,00" },
    { label: "No mês", value: "R$ 0,00" },
    { label: "Total faturamento histórico", value: "R$ 0,00" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl bg-muted/60 p-4">
            <p className="text-sm text-muted-foreground">{r.label}</p>
            <p className="mt-1 text-lg font-bold">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeuBancoCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/15 text-primary grid place-items-center">
          <MessageCircle className="h-5 w-5" />
        </div>
        <span className="font-semibold">Você está no top +100 da Monetisex!</span>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Faturamento hoje</p>
        <div className="mt-2 h-0.5 w-8 bg-foreground/60 rounded-full" />
      </div>
      <div className="rounded-xl bg-muted/60 grid grid-cols-2 divide-x divide-border">
        <div className="p-4">
          <p className="text-lg font-bold">R$ 0,00</p>
          <p className="text-xs text-muted-foreground mt-1">Saldo liberado</p>
        </div>
        <div className="p-4">
          <p className="text-lg font-bold">R$ 0,00</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            Saldo a liberar <Info className="h-3 w-3" />
          </p>
        </div>
      </div>
      <Link
        to="/dashboard"
        className="block text-center rounded-full border border-border py-3 text-sm font-semibold hover:bg-accent transition-colors"
      >
        Acessar Meu Banco
      </Link>
    </div>
  );
}

function AssinantesCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <h3 className="text-lg font-bold tracking-tight">Assinantes</h3>
      <div className="rounded-xl bg-muted/60 p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-bold">0</span>
      </div>
      <div className="rounded-xl bg-muted/60 p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Ativos</span>
        <span className="text-lg font-bold">0</span>
      </div>
      <button
        type="button"
        className="w-full rounded-xl bg-muted/60 p-4 flex items-center justify-between text-left hover:bg-muted transition-colors"
      >
        <span className="text-sm text-foreground">Faturamento em relação a outros criadores</span>
        <Minus className="h-4 w-4 text-muted-foreground" />
      </button>
      <p className="pt-2 text-center text-sm text-muted-foreground">
        Parabéns, você está entre os melhores criadores Monetisex! Continue assim!
      </p>
    </div>
  );
}

function ProjecaoFaturamentoCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <div>
        <h3 className="text-lg font-bold tracking-tight">Projeção de Faturamento</h3>
        <p className="text-sm text-muted-foreground mt-1">July/26</p>
      </div>
      <div className="rounded-xl bg-muted/60 p-4">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="mt-1 text-lg font-bold">R$ 0,00</p>
      </div>
      <div className="rounded-xl bg-muted/60 p-4">
        <p className="text-sm text-muted-foreground">Média Dia</p>
        <p className="mt-1 text-lg font-bold">R$ 0,00</p>
      </div>
      <div className="rounded-xl bg-muted/60 p-4 flex items-start justify-between">
        <span className="text-sm text-muted-foreground">Projeção</span>
        <div className="text-right">
          <p className="text-lg font-bold text-primary">R$ 0,00</p>
          <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
            +0% <ArrowUp className="h-3 w-3" />
          </p>
        </div>
      </div>
    </div>
  );
}

function RecordeCard({ title }: { title: string }) {
  const tops = ["TOP 1", "TOP 2", "TOP 3"];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <div className="space-y-3">
        {tops.map((t) => (
          <button
            key={t}
            type="button"
            className="w-full rounded-xl bg-muted/60 p-4 text-left hover:bg-muted transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t}</span>
              <Minus className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-muted-foreground">—</p>
          </button>
        ))}
      </div>
    </div>
  );
}

const EXTRATO_TABS = ["Faturamento", "Ganhos por produto"] as const;
const PRODUTO_OPTIONS = ["Todos os produtos", "Live", "Desafio", "Chat", "Postagem", "Videochamada", "Mimo", "Assinatura"] as const;
const EXTRATO_FILTROS = ["Todos", "Concluídos", "A receber", "Estornos"] as const;

function ExtratosPanel() {
  const [extratoTab, setExtratoTab] = useState<(typeof EXTRATO_TABS)[number]>("Faturamento");
  const [produtoFilter, setProdutoFilter] =
    useState<(typeof PRODUTO_OPTIONS)[number]>("Todos os produtos");
  const [filtro, setFiltro] = useState<(typeof EXTRATO_FILTROS)[number]>("Todos");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {EXTRATO_TABS.map((t) => {
          const isActive = t === extratoTab;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setExtratoTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {t}
            </button>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-card text-foreground border border-border hover:bg-accent transition-colors"
            >
              {produtoFilter}
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-56 rounded-2xl border-border bg-popover text-popover-foreground shadow-lg p-2"
          >
            {PRODUTO_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt}
                onSelect={() => setProdutoFilter(opt)}
                className="py-3 px-3 text-base cursor-pointer rounded-xl"
              >
                {opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-5">
          {extratoTab === "Ganhos por produto" ? (
            <>
              <GanhosPorProdutoChartCard />
              <GanhosPorProdutoTable />
            </>
          ) : (
            <>
              <ExtratoChartCard title={produtoFilter} />
              <ExtratoFiltrosRow active={filtro} onChange={setFiltro} />
              <ExtratoTable />
            </>
          )}
        </div>
        <div className="space-y-5">
          <TopBadgeCard />
          <Top5PaisesCard />
          <ExtratoFaturamentoCard />
        </div>
      </div>
    </div>
  );
}

function GanhosPorProdutoChartCard() {
  const legend = [
    { label: "Assinatura", color: "bg-purple-500" },
    { label: "Live", color: "bg-blue-500" },
    { label: "Indicações", color: "bg-primary" },
    { label: "Chamada 1:1", color: "bg-emerald-500" },
    { label: "Mimo", color: "bg-rose-500" },
    { label: "Publicação paga", color: "bg-slate-400" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-lg font-bold tracking-tight">Ganhos por produto</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-lg font-bold">R$ 0,00</span>
        <span className="text-sm text-muted-foreground">total no período</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {legend.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${l.color}`} />
            <span className="text-foreground">{l.label}</span>
          </span>
        ))}
      </div>

      <div className="mt-6 relative h-56">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10">R$ 0,01</span>
              <div className="flex-1 border-t border-dashed border-border" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-between text-xs text-muted-foreground pl-13">
        <span>Jun 9,<br />2026</span>
        <span>Jun 16,<br />2026</span>
        <span>Jun 24,<br />2026</span>
        <span>Jul 2,<br />2026</span>
        <span>Jul 9,<br />2026</span>
      </div>
    </div>
  );
}

function GanhosPorProdutoTable() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-10 text-sm text-muted-foreground">
        <span>Produto</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Sua comissão</span>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-x-10 items-center text-sm">
        <span className="inline-flex items-center gap-2 font-bold text-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Total
        </span>
        <span className="text-right font-bold">R$ 0,00</span>
        <span className="text-right font-bold text-primary">R$ 0,00</span>
      </div>
      <div className="mt-3 h-1 w-full bg-primary rounded-full" />
    </div>
  );
}


function ExtratoChartCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          <span className="text-lg font-bold">R$ 0,00</span>
          <span className="text-sm text-muted-foreground">(R$ 0,00 Bruto)</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-foreground">Faturamento</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
            <span className="text-muted-foreground">Quantidade</span>
          </span>
        </div>
      </div>

      <div className="mt-6 relative h-64">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-8">R$0</span>
              <div className="flex-1 border-t border-dashed border-border" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-between text-xs text-muted-foreground pl-11">
        <span>Jun 9,<br />2026</span>
        <span>Jun 16,<br />2026</span>
        <span>Jun 24,<br />2026</span>
        <span>Jul 2,<br />2026</span>
        <span>Jul 9,<br />2026</span>
      </div>
    </div>
  );
}

function ExtratoFiltrosRow({
  active,
  onChange,
}: {
  active: (typeof EXTRATO_FILTROS)[number];
  onChange: (f: (typeof EXTRATO_FILTROS)[number]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold text-foreground">Filtrar por</span>
      <div className="flex flex-wrap items-center gap-2">
        {EXTRATO_FILTROS.map((f) => (
          <Chip key={f} label={f} active={f === active} onClick={() => onChange(f)} />
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm font-semibold text-foreground hover:bg-accent transition-colors"
        >
          Exportar extrato
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ExtratoTable() {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="grid grid-cols-5 px-5 py-3 text-sm text-muted-foreground border-b border-border">
        <span>Data</span>
        <span>Assinante</span>
        <span>Valor</span>
        <span>Sua comissão</span>
        <span>Status</span>
      </div>
      <p className="py-10 px-5 text-center text-sm text-muted-foreground">
        Nenhuma venda encontrada para este filtro.
      </p>
    </div>
  );
}

function Top5PaisesCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-bold">Top 5 países</h3>
      <p className="mt-1 text-sm text-muted-foreground">Países onde você mais faturou</p>
    </div>
  );
}

function ExtratoFaturamentoCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-base font-bold">Faturamento</h3>
      <div className="mt-4 rounded-xl bg-muted/60 p-4">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="mt-1 text-lg font-bold">R$ 0,00</p>
      </div>
    </div>
  );
}

const ENGAJAMENTO_TABS = ["Publicações", "Lives"] as const;
const ORDENAR_PUBLICACOES = ["Recentes", "Faturamento", "Mimos", "Curtidas", "Comentários"] as const;
const ORDENAR_LIVES = ["Mais compradas", "Mimos", "Visualizações", "Comentários", "Curtidas"] as const;

function EngajamentoPanel() {
  const [tab, setTab] = useState<(typeof ENGAJAMENTO_TABS)[number]>("Publicações");
  const [ordenarPub, setOrdenarPub] =
    useState<(typeof ORDENAR_PUBLICACOES)[number]>("Recentes");
  const [ordenarLive, setOrdenarLive] =
    useState<(typeof ORDENAR_LIVES)[number]>("Mais compradas");

  const isLives = tab === "Lives";
  const options = isLives ? ORDENAR_LIVES : ORDENAR_PUBLICACOES;
  const activeOrder = isLives ? ordenarLive : ordenarPub;
  const setActiveOrder = (o: string) =>
    isLives
      ? setOrdenarLive(o as (typeof ORDENAR_LIVES)[number])
      : setOrdenarPub(o as (typeof ORDENAR_PUBLICACOES)[number]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {ENGAJAMENTO_TABS.map((t) => {
          const isActive = t === tab;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <p className="text-sm font-bold text-foreground">Ordenar por</p>
        <div className="flex flex-wrap items-center gap-2">
          {options.map((o) => (
            <Chip key={o} label={o} active={o === activeOrder} onClick={() => setActiveOrder(o)} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="text-base font-bold">
                  {isLives ? "0 compras" : "1 postagem"}
                </span>
                <span className="text-base font-bold">R$ 0,00</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-foreground">Faturamento</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                  <span className="text-muted-foreground">Quantidade</span>
                </span>
              </div>
            </div>
            <p className={`text-center text-sm text-muted-foreground ${isLives ? "py-28" : "py-16"}`}>
              Sem dados de engajamento para o período selecionado.
            </p>
          </div>
          {!isLives && (
            <p className="text-center text-sm text-muted-foreground">
              Nenhuma publicação encontrada no período.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-bold">Resumo</h3>
            {isLives ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center">
                      <Radio className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quantidade</p>
                      <p className="text-base font-bold">0</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Visualizações</p>
                      <p className="text-base font-bold">0</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                    <p className="text-base font-bold">R$ 0,00</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantidade</p>
                    <p className="text-base font-bold">0</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                    <p className="text-base font-bold">R$ 0,00</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-bold">{isLives ? "Top live" : "Top postagem"}</h3>
            <p className="mt-6 text-sm text-muted-foreground">
              {isLives
                ? "Sem dados de engajamento para o período selecionado."
                : "Nenhuma postagem encontrada no período."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlcancePanel() {
  const summary = [
    { icon: Users, label: "Visitantes", value: "0" },
    { icon: UserPlus, label: "Assinaturas", value: "0" },
    { icon: DollarSign, label: "Assinaturas", value: "R$ 0,00" },
    { icon: UserPlus, label: "Renovações", value: "0" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold tracking-tight">0 Visitantes</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-foreground">Visitantes</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                  <span className="text-muted-foreground">Usuários</span>
                </span>
              </div>
            </div>

            <div className="mt-6 relative h-56">
              <div className="absolute inset-0 flex flex-col justify-between">
                {["1", "1", "0"].map((label, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-6">{label}</span>
                    <div className="flex-1 border-t border-dashed border-border" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex justify-between text-xs text-muted-foreground pl-9">
              <span>08/06</span>
              <span>14/06</span>
              <span>20/06</span>
              <span>26/06</span>
              <span>02/07</span>
              <span>08/07</span>
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
              <span className="text-right">0</span>
              <span className="text-right">0</span>
              <span className="text-right font-bold">0</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-bold">Principais países</h3>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Nenhum dado disponível para o período.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-base font-bold">Resumo</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {summary.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full border border-border text-primary grid place-items-center bg-card">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="text-base font-bold">{s.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ASSINANTES_TABS = ["Assinaturas", "Top assinantes", "Atividade dos assinantes"] as const;
const ASSINANTES_FILTROS = ["Todos", "Renovações", "Novos assinantes"] as const;
const TOP_ASSINANTES_CHIPS = ["Total", "Assinaturas", "Mimos", "Chat"] as const;

function AssinantesPanel() {
  const [tab, setTab] = useState<(typeof ASSINANTES_TABS)[number]>("Assinaturas");
  const [filtro, setFiltro] = useState<(typeof ASSINANTES_FILTROS)[number]>("Todos");
  const [topFiltro, setTopFiltro] =
    useState<(typeof TOP_ASSINANTES_CHIPS)[number]>("Total");
  const [topMainFiltro, setTopMainFiltro] =
    useState<(typeof TOP_ASSINANTES_CHIPS)[number]>("Total");

  const [query, setQuery] = useState("");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {ASSINANTES_TABS.map((t) => {
          const isActive = t === tab;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div className="border-t border-border pt-5">
        {tab === "Assinaturas" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-5">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-bold">0 Assinantes, R$ 0,00</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-foreground">Faturamento</span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                        <span className="text-muted-foreground">Quantidade</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 relative h-64">
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {["R$1", "R$1", "R$0", "1", "1"].map((label, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-8">{label}</span>
                          <div className="flex-1 border-t border-dashed border-border" />
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 grid place-items-center pointer-events-none">
                      <p className="text-sm text-muted-foreground">
                        Nenhum dado disponível para o período.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between text-xs text-muted-foreground pl-11">
                    <span>Jun 9,<br />2026</span>
                    <span>Jun 16,<br />2026</span>
                    <span>Jun 24,<br />2026</span>
                    <span>Jul 2,<br />2026</span>
                    <span>Jul 9,<br />2026</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <h3 className="text-base font-bold">Top assinantes</h3>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {TOP_ASSINANTES_CHIPS.map((c) => (
                      <div key={c} className="shrink-0">
                        <Chip
                          label={c}
                          active={c === topFiltro}
                          onClick={() => setTopFiltro(c)}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Sem dados para este filtro.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <h3 className="text-base font-bold">Assinantes por faixa de preço</h3>
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Nenhum dado disponível para o período.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:w-2/3 space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-bold text-foreground">Filtrar por</p>
                <div className="flex flex-wrap items-center gap-2">
                  {ASSINANTES_FILTROS.map((f) => (
                    <Chip
                      key={f}
                      label={f}
                      active={f === filtro}
                      onClick={() => setFiltro(f)}
                    />
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar assinantes..."
                  className="w-full rounded-full border border-border bg-card pl-11 pr-5 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
                <div className="grid grid-cols-4 px-5 py-3 text-sm text-muted-foreground border-b border-border">
                  <span>Nome</span>
                  <span>Status</span>
                  <span>Preço</span>
                  <span>Duração total</span>
                </div>
                <p className="py-10 px-5 text-center text-sm text-muted-foreground">
                  Nenhum assinante encontrado.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Em breve.
          </div>
        )}
      </div>
    </div>
  );
}




