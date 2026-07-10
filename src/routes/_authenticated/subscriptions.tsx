import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Search, ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
type SortKey = "recentes" | "antigas" | "nome_asc" | "nome_desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recentes", label: "Mais recentes" },
  { key: "antigas", label: "Mais antigas" },
  { key: "nome_asc", label: "Nome A–Z" },
  { key: "nome_desc", label: "Nome Z–A" },
];

function SubscriptionsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("ativas");
  const [filter, setFilter] = useState<FilterKey>("todas");
  const [sort, setSort] = useState<SortKey>("recentes");
  const [query, setQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);

  // Sem dados por enquanto — placeholder para lista.
  const items = useMemo(() => [] as { id: string; name: string }[], []);
  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.key === sort)?.label ?? "Ordenar";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-24">
        {/* Header */}
        <div className="relative flex items-center justify-center py-2">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => router.history.back()}
            className="absolute left-0 grid h-10 w-10 place-items-center rounded-full hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Assinaturas</h1>
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

          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-1.5 text-sm hover:bg-accent"
              >
                {currentSortLabel === "Mais recentes" ? "Ordenar" : currentSortLabel}
                <ChevronDown className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 rounded-2xl p-1">
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
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span className={cn(active && "text-primary font-medium")}>
                      {o.label}
                    </span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
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
