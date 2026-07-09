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
          <SubTabsRow tabs={SUB_TABS} active={subTab} onChange={setSubTab} />
        </div>

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
