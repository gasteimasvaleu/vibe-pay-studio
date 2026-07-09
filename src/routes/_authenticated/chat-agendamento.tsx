import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Archive,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Image as ImageIcon,
  Images,
  Info,
  Mic,
  Plus,
  Search,
  Smile,
  Tag,
  X,
} from "lucide-react";
import { AppTopBar } from "@/components/site/AppTopBar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";


import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilterChip } from "@/components/chat/FilterChip";
import { ComposerIcon } from "@/components/chat/ComposerIcon";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  view: fallback(z.string(), "calendar").default("calendar"),
});

export const Route = createFileRoute("/_authenticated/chat-agendamento")({
  validateSearch: zodValidator(searchSchema),
  component: ChatSchedulingPage,
});

const CONTACT_FILTERS = [
  "Todos",
  "Seguidores",
  "Seguindo",
  "Expirados",
  "Top 100 Compradores",
  "Expiram em 7 Dias",
  "Interações",
  "Top 1000 Compradores",
];

function ChatSchedulingPage() {
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentMonth, setCurrentMonth] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const { view: initialView } = Route.useSearch();
  const [view, setView] = useState<"calendar" | "composer">(
    initialView === "composer" ? "composer" : "calendar"
  );
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [message, setMessage] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const weeks = useMemo(() => buildMonthMatrix(currentMonth), [currentMonth]);

  const toggleFilter = (name: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="min-h-[100svh] bg-background text-foreground flex flex-col">
      <AppTopBar />

      {view === "calendar" ? (
        <>
          <header className="relative h-14 flex items-center justify-center border-b border-border px-4">
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => navigate({ to: "/chat" })}
              className="absolute left-3 h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-foreground">
              Mensagens Agendadas
            </h1>
            <button
              type="button"
              aria-label="Nova mensagem"
              onClick={() => {
                setView("composer");
                setDateDialogOpen(true);
              }}
              className="absolute right-3 h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-foreground transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto w-full">
            {/* Calendar column */}
            <div className="p-6 md:border-r border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Mês anterior"
                    onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
                    className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent text-muted-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próximo mês"
                    onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                    className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent text-muted-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <span className="ml-2 font-semibold text-foreground capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Ir para hoje"
                  onClick={() => {
                    setCurrentMonth(today);
                    setSelectedDate(today);
                  }}
                  className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent text-muted-foreground"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center text-xs font-semibold text-foreground pb-2">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weeks.flat().map((day) => {
                  const inMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, today);
                  const isSelected = isSameDay(day, selectedDate);
                  return (
                    <button
                      type="button"
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square rounded-lg text-sm flex items-center justify-center transition-colors",
                        !inMonth && "text-muted-foreground/50",
                        inMonth && !isSelected && "text-foreground hover:bg-accent",
                        isToday && !isSelected && "bg-accent/40",
                        isSelected &&
                          "bg-card border border-border font-bold shadow-sm",
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected day column */}
            <div className="p-6 flex flex-col">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
                <button
                  type="button"
                  aria-label="Dia anterior"
                  onClick={() => {
                    const prev = subDays(selectedDate, 1);
                    setSelectedDate(prev);
                    if (!isSameMonth(prev, currentMonth)) setCurrentMonth(prev);
                  }}
                  className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent text-muted-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-foreground">
                  {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <button
                  type="button"
                  aria-label="Próximo dia"
                  onClick={() => {
                    const next = addDays(selectedDate, 1);
                    setSelectedDate(next);
                    if (!isSameMonth(next, currentMonth)) setCurrentMonth(next);
                  }}
                  className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent text-muted-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex justify-center mb-8">
                <button
                  type="button"
                  aria-label="Nova mensagem agendada"
                  onClick={() => {
                    setView("composer");
                    setDateDialogOpen(true);
                  }}
                  className="h-10 w-10 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8">
                <CalendarDays className="h-16 w-16 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  Não há mensagens agendadas para esse dia
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <Composer
          onClose={() => setView("calendar")}
          message={message}
          onMessageChange={setMessage}
          contactSearch={contactSearch}
          onContactSearchChange={setContactSearch}
          activeFilters={activeFilters}
          toggleFilter={toggleFilter}
          scheduledAt={scheduledAt}
          onOpenDateDialog={() => setDateDialogOpen(true)}
          onClearSchedule={() => setScheduledAt(null)}
        />
      )}

      <DateDialog
        open={dateDialogOpen}
        onOpenChange={setDateDialogOpen}
        selectedDate={selectedDate}
        onConfirm={(dt) => {
          setScheduledAt(dt);
          setDateDialogOpen(false);
        }}
      />
    </div>
  );
}

function buildMonthMatrix(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const weeks: Date[][] = [];
  let cursor = start;
  while (cursor <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function Composer({
  onClose,
  message,
  onMessageChange,
  contactSearch,
  onContactSearchChange,
  activeFilters,
  toggleFilter,
  scheduledAt,
  onOpenDateDialog,
  onClearSchedule,
}: {
  onClose: () => void;
  message: string;
  onMessageChange: (v: string) => void;
  contactSearch: string;
  onContactSearchChange: (v: string) => void;
  activeFilters: Set<string>;
  toggleFilter: (name: string) => void;
  scheduledAt: Date | null;
  onOpenDateDialog: () => void;
  onClearSchedule: () => void;
}) {
  const canContinue = message.trim().length > 0 && activeFilters.size > 0;

  return (
    <div className="flex-1 relative">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-foreground"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] h-full min-h-[calc(100svh-56px)]">
        {/* Left: contacts */}
        <aside className="border-r border-border p-6 flex flex-col overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              aria-label="Voltar"
              onClick={onClose}
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold">Mensagem em massa</h2>
          </div>


            <h3 className="text-sm font-semibold text-foreground mb-3">
              Selecione seus contatos
            </h3>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={contactSearch}
                onChange={(e) => onContactSearchChange(e.target.value)}
                placeholder="Pesquisar"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {CONTACT_FILTERS.map((f) => (
                <FilterChip
                  key={f}
                  active={activeFilters.has(f)}
                  onClick={() => toggleFilter(f)}
                >
                  {f}
                </FilterChip>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Novo limite de disparos em massa
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Você tem até <strong className="text-foreground">5 disparos</strong> hoje. Planeje suas mensagens com antecedência.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <Button
                type="button"
                disabled={activeFilters.size === 0}
                className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 font-semibold"
              >
                Aplicar filtro
              </Button>
            </div>
          </aside>

          {/* Right: message */}
          <section className="flex flex-col overflow-hidden">
            <div className="hidden md:block border-b border-border px-6 py-4">
              <h2 className="text-center text-base font-semibold">
                Selecionar usuários para enviar mensagem em massa
              </h2>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                Escreva sua mensagem
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Digite e envie a mensagem em massa para os usuários selecionados.
              </p>
            </div>

            <div className="border-t border-border p-4 space-y-3">
              {scheduledAt && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-accent/40 border border-border px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">
                      Programado para
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {format(scheduledAt, "dd/MM, HH:mm", { locale: ptBR })}
                    </span>
                    <button
                      type="button"
                      aria-label="Remover agendamento"
                      onClick={onClearSchedule}
                      className="h-6 w-6 grid place-items-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <Textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                placeholder="Digite uma mensagem"
                className="min-h-14 resize-none border-0 shadow-none focus-visible:ring-0 px-1"
              />

              <div className="border-b border-border" />

              <TooltipProvider delayDuration={200}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <ComposerIcon icon={ImageIcon} label="Adicionar mídia" />
                    <ComposerIcon icon={Mic} label="Gravar um áudio" />
                    <ComposerIcon icon={Archive} label="Adicionar mídia do acervo" />
                    <ComposerIcon
                      icon={CalendarCheck}
                      label="Agendar mensagem"
                      onClick={onOpenDateDialog}
                      active={!!scheduledAt}
                    />
                    <ComposerIcon icon={Images} label="Adicionar GIF" />
                    <ComposerIcon icon={Smile} label="Adicionar um emoji" />
                    <ComposerIcon icon={Tag} label="Adicionar tag" />
                  </div>
                  <Button
                    type="button"
                    disabled={!canContinue}
                    className="rounded-full px-6 h-10 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 font-semibold uppercase tracking-wide"
                  >
                    Continuar
                  </Button>
                </div>
              </TooltipProvider>
            </div>
          </section>
        </div>
      </div>
  );
}

function DateDialog({
  open,
  onOpenChange,
  selectedDate,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedDate: Date;
  onConfirm: (dt: Date) => void;
}) {
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);

  const bump = (setter: (v: number) => void, current: number, delta: number, max: number) => {
    const next = (current + delta + max) % max;
    setter(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="px-6 pt-6">
          <DialogTitle className="text-sm font-bold tracking-wide">
            DATA DE AGENDAMENTO
          </DialogTitle>
        </div>

        <div className="flex border-b border-border mt-4">
          <div className="flex-1 py-3 text-center text-sm text-muted-foreground">
            {format(selectedDate, "MMM. d, EEE.", { locale: ptBR })}
          </div>
          <div className="flex-1 py-3 text-center text-sm font-semibold text-primary border-b-2 border-primary -mb-px">
            {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
          </div>
        </div>

        <div className="grid grid-cols-2 items-center py-8 px-6">
          <TimeSpinner
            value={hour}
            onUp={() => bump(setHour, hour, 1, 24)}
            onDown={() => bump(setHour, hour, -1, 24)}
          />
          <TimeSpinner
            value={minute}
            onUp={() => bump(setMinute, minute, 1, 60)}
            onDown={() => bump(setMinute, minute, -1, 60)}
          />
        </div>

        <div className="flex items-center justify-center gap-3 px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const dt = new Date(selectedDate);
              dt.setHours(hour, minute, 0, 0);
              onConfirm(dt);
            }}
            className="rounded-full px-6 border-primary text-primary hover:bg-primary/10"
          >
            Confirmar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-6"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TimeSpinner({
  value,
  onUp,
  onDown,
}: {
  value: number;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onUp}
        className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Aumentar"
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <span className="text-4xl font-semibold tabular-nums text-foreground">
        {String(value).padStart(2, "0")}
      </span>
      <button
        type="button"
        onClick={onDown}
        className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Diminuir"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}
