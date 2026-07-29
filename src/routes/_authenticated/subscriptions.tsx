import { useDeferredValue, useMemo, useState } from "react";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Crown,
  ExternalLink,
  Search,
  User,
  XCircle,
} from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listMySubscriptions,
  cancelSubscription,
  reactivateSubscription,
  type MySubscription,
} from "@/lib/monetization.functions";
import { listSavedCards, type SavedCardDTO } from "@/lib/saved-cards.functions";
import { toast } from "sonner";

const subscriptionsQueryOptions = queryOptions({
  queryKey: ["mySubscriptions"],
  queryFn: () => listMySubscriptions(),
});

export const Route = createFileRoute("/_authenticated/subscriptions")({
  head: () => ({
    meta: [
      { title: "Assinaturas · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(subscriptionsQueryOptions),
  pendingComponent: SubscriptionsPending,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-destructive" role="alert">
      Erro ao carregar assinaturas: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center text-sm text-muted-foreground">
      Nenhuma assinatura encontrada.
    </div>
  ),
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

const PLAN_LABELS: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
};

function isActive(sub: MySubscription) {
  const now = new Date();
  const end = new Date(sub.currentPeriodEnd);
  if (sub.status === "active") return true;
  if (sub.status === "cancelled" && end > now) return true;
  return false;
}

function isExpired(sub: MySubscription) {
  const now = new Date();
  const end = new Date(sub.currentPeriodEnd);
  if (sub.status === "expired") return true;
  if (end <= now) return true;
  return false;
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SubscriptionsPending() {
  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <span className="w-9" />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="mt-5 flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="mt-10 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </main>
    </div>
  );
}

function SubscriptionsPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cancelFn = useServerFn(cancelSubscription);

  const { data } = useSuspenseQuery(subscriptionsQueryOptions);

  const [tab, setTab] = useState<TabKey>("ativas");
  const [filter, setFilter] = useState<FilterKey>("todas");
  const [sort, setSort] = useState<SortKey>("proxima_expiracao");
  const [query, setQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);

  const deferredQ = useDeferredValue(query);

  const cancelMutation = useMutation({
    mutationFn: (subscriptionId: string) =>
      cancelFn({ data: { subscriptionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mySubscriptions"] });
    },
  });

  const filtered = useMemo(() => {
    let rows = [...data];

    // Aba
    if (tab === "ativas") {
      rows = rows.filter(isActive);
    } else {
      rows = rows.filter(isExpired);
    }

    // Filtro de preço
    if (filter === "gratuitas") {
      rows = rows.filter((s) => s.priceCents === 0);
    } else if (filter === "pagas") {
      rows = rows.filter((s) => s.priceCents > 0);
    }

    // Busca
    const q = deferredQ.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (s) =>
          (s.creatorDisplayName ?? "").toLowerCase().includes(q) ||
          (s.creatorUsername ?? "").toLowerCase().includes(q),
      );
    }

    // Ordenação
    rows.sort((a, b) => {
      switch (sort) {
        case "proxima_expiracao":
          return (
            new Date(a.currentPeriodEnd).getTime() -
            new Date(b.currentPeriodEnd).getTime()
          );
        case "distante_expiracao":
          return (
            new Date(b.currentPeriodEnd).getTime() -
            new Date(a.currentPeriodEnd).getTime()
          );
        case "nome_asc": {
          const na = (a.creatorDisplayName || a.creatorUsername || "").toLowerCase();
          const nb = (b.creatorDisplayName || b.creatorUsername || "").toLowerCase();
          return na.localeCompare(nb);
        }
        case "nome_desc": {
          const na = (a.creatorDisplayName || a.creatorUsername || "").toLowerCase();
          const nb = (b.creatorDisplayName || b.creatorUsername || "").toLowerCase();
          return nb.localeCompare(na);
        }
        default:
          return 0;
      }
    });

    return rows;
  }, [data, tab, filter, deferredQ, sort]);

  const sortButtonLabel =
    sort === "proxima_expiracao"
      ? "Ordenar"
      : (SORT_OPTIONS.find((o) => o.key === sort)?.label ?? "Ordenar");

  const emptyMessage =
    tab === "ativas"
      ? "Você ainda não tem assinaturas ativas."
      : "Nenhuma assinatura expirada.";

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="relative mx-auto flex max-w-2xl items-center justify-center px-4 py-3">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => router.history.back()}
            className="absolute left-4 h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Assinaturas
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-24">
        {/* Busca */}
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar"
            className="h-12 rounded-2xl border-transparent bg-card pl-11 text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/40"
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
                    "rounded-md border px-4 py-1.5 text-sm transition-colors",
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
                className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-4 text-sm hover:bg-accent"
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
                          active
                            ? "border-primary"
                            : "border-muted-foreground/40",
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
          {data.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Você ainda não tem assinaturas.
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              {deferredQ.trim()
                ? "Nenhum resultado para sua busca."
                : emptyMessage}
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((sub) => {
                const name =
                  sub.creatorDisplayName || sub.creatorUsername || "Creator";
                const initial = name.slice(0, 1).toUpperCase();
                const clickable = !!sub.creatorUsername;
                const expired = isExpired(sub);
                const cancelled = sub.status === "cancelled";
                const paid = sub.priceCents > 0;

                return (
                  <li
                    key={sub.id}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() =>
                          clickable &&
                          navigate({
                            to: "/perfil/$username",
                            params: { username: sub.creatorUsername! },
                          })
                        }
                        className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground disabled:cursor-default"
                      >
                        {sub.creatorAvatarUrl ? (
                          <img
                            src={sub.creatorAvatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initial
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground truncate">
                              {name}
                            </p>
                            {sub.creatorUsername && (
                              <p className="text-xs text-muted-foreground truncate">
                                @{sub.creatorUsername}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                            {paid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                <Crown className="h-3 w-3" />
                                {formatBRL(sub.priceCents)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                <User className="h-3 w-3" />
                                Grátis
                              </span>
                            )}

                            {expired ? (
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                Expirada
                              </span>
                            ) : cancelled ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                Cancelada
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                                Ativa
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {expired
                              ? `Expirou em ${formatDate(sub.currentPeriodEnd)}`
                              : `Expira em ${formatDate(sub.currentPeriodEnd)}`}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Crown className="h-3.5 w-3.5" />
                            {PLAN_LABELS[sub.plan] ?? sub.plan}
                          </span>
                        </div>

                        {!expired && paid && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Renovação manual — você receberá um lembrete por e-mail
                            7 dias antes da expiração.
                          </p>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="h-9 gap-1 rounded-lg"
                            disabled={!clickable}
                            onClick={() =>
                              clickable &&
                              navigate({
                                to: "/perfil/$username",
                                params: { username: sub.creatorUsername! },
                              })
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                            {expired ? "Renovar agora" : "Ir ao perfil"}
                          </Button>
                        </div>

                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
