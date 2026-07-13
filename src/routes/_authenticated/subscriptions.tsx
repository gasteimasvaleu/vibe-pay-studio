import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/subscriptions")({
  head: () => ({
    meta: [
      { title: "Assinaturas · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SubscriptionsPage,
});

type TabKey = "ativas" | "expiradas";
type FilterKey = "todas" | "gratuitas" | "pagas";
type SortKey =
  | "proxima_expiracao"
  | "distante_expiracao"
  | "nome_asc"
  | "nome_desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "proxima_expiracao", label: "Mais próximo da expiração" },
  { key: "distante_expiracao", label: "Mais distante da expiração" },
  { key: "nome_asc", label: "Nome (A-Z)" },
  { key: "nome_desc", label: "Nome (Z-A)" },
];

function SubscriptionsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("ativas");
  const [filter, setFilter] = useState<FilterKey>("todas");
  const [sort, setSort] = useState<SortKey>("proxima_expiracao");
  const [query, setQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);

  const items = useMemo(() => [] as { id: string; name: string }[], []);
  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const sortButtonLabel =
    sort === "proxima_expiracao"
      ? "Ordenar"
      : (SORT_OPTIONS.find((o) => o.key === sort)?.label ?? "Ordenar");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-24">
        {/* Header */}
        <div className="relative flex items-center justify-center py-2">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => router.history.back()}
            className="absolute left-0 h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">Assinaturas</h1>
        </div>

        {/* Busca */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar"
            className="h-12 rounded-2xl border-transparent bg-muted pl-11 text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/40"
          />
        </div>

        {/* Tabs */}
        <div className="mt-5 grid grid-cols-2 border-b border-border">
          {(
            [
              { key: "ativas", label: "Ativas" },
              { key: "expiradas", label: "Expiradas" },
            ] as { key: TabKey; label: string }[]
          ).map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative py-3 text-center text-base transition-colors",
                  active
                    ? "font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-6 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Filtros + Ordenar */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: "todas", label: "Todas" },
                { key: "gratuitas", label: "Gratuitas" },
                { key: "pagas", label: "Pagas" },
              ] as { key: FilterKey; label: string }[]
            ).map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary text-primary"
                      : "border-border text-foreground hover:bg-accent",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <Sheet open={sortOpen} onOpenChange={setSortOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-1.5 text-sm hover:bg-accent"
              >
                {sortButtonLabel}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    sortOpen && "rotate-180",
                  )}
                />
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-3xl border-t-0 p-0 sm:max-w-[420px] sm:mx-auto sm:left-0 sm:right-0"
            >
              <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted" />
              <SheetHeader className="px-6 pt-4 pb-2 text-left">
                <SheetTitle className="text-xl font-semibold">
                  Ordenar por
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-3 px-6 pb-8 pt-2">
                {SORT_OPTIONS.map((o) => {
                  const active = sort === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => {
                        setSort(o.key);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border bg-muted/50 px-5 py-4 text-left text-base transition-colors",
                        active
                          ? "border-primary"
                          : "border-transparent hover:bg-muted",
                      )}
                    >
                      <span className="font-medium">{o.label}</span>
                      <span
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-full border-2",
                          active ? "border-primary" : "border-muted-foreground/40",
                        )}
                      >
                        {active && (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Lista / estado vazio */}
        <div className="mt-10">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              {tab === "ativas"
                ? "Você ainda não tem assinaturas ativas."
                : "Nenhuma assinatura expirada."}
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((i) => (
                <li
                  key={i.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  {i.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
