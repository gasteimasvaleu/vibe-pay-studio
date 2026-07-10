import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mywallet/extrato")({
  head: () => ({
    meta: [
      { title: "Extrato · Monetisex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExtratoPage,
});

const TIPO_ITEM_OPTIONS = ["Todos", "Depósito", "Bônus promocional", "Estorno"];
const TIPO_MOV_OPTIONS = ["Todos", "Entradas", "Saídas"];

function ExtratoPage() {
  const router = useRouter();
  const [tipoItem, setTipoItem] = useState<string | null>(null);
  const [tipoMov, setTipoMov] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [itemOpen, setItemOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{ background: "var(--gradient-radial)" }}
      />

      <header className="relative z-10 border-b border-border backdrop-blur-md bg-card/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Extrato
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Tipo de item */}
          <Popover open={itemOpen} onOpenChange={setItemOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-12 rounded-full justify-between px-5 font-normal",
                  !tipoItem && "text-muted-foreground",
                )}
              >
                {tipoItem ?? "Tipo de item"}
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
              <div className="flex flex-wrap gap-2">
                {TIPO_ITEM_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setTipoItem(opt === "Todos" ? null : opt);
                      setItemOpen(false);
                    }}
                    className={cn(
                      "h-9 px-4 rounded-full text-sm font-semibold transition-colors",
                      tipoItem === opt || (opt === "Todos" && !tipoItem)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Tipo de movimentação */}
          <Popover open={movOpen} onOpenChange={setMovOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-12 rounded-full justify-between px-5 font-normal",
                  !tipoMov && "text-muted-foreground",
                )}
              >
                {tipoMov ?? "Tipo de movimentação"}
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
              <div className="flex flex-wrap gap-2">
                {TIPO_MOV_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setTipoMov(opt === "Todos" ? null : opt);
                      setMovOpen(false);
                    }}
                    className={cn(
                      "h-9 px-4 rounded-full text-sm font-semibold transition-colors",
                      tipoMov === opt || (opt === "Todos" && !tipoMov)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Intervalo de datas */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-12 rounded-full px-5 font-normal justify-start gap-3"
              >
                <CalendarIcon className="h-4 w-4 opacity-70 shrink-0" />
                <span
                  className={cn(
                    !range?.from && "text-muted-foreground",
                  )}
                >
                  {range?.from
                    ? format(range.from, "dd/MM/yyyy")
                    : "Data inicial"}
                </span>
                <span className="text-muted-foreground">Até</span>
                <span
                  className={cn(
                    !range?.to && "text-muted-foreground",
                  )}
                >
                  {range?.to ? format(range.to, "dd/MM/yyyy") : "Data final"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Últimas movimentações */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Últimas movimentações
          </h2>
          <div className="rounded-2xl border border-border bg-card p-10 shadow-[var(--shadow-card)]">
            <p className="text-center text-sm text-muted-foreground">
              Nenhuma transação encontrada
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
