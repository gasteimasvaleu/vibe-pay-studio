import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listMySubscribers } from "@/lib/monetization.functions";

const subscribersQueryOptions = queryOptions({
  queryKey: ["mySubscribers"],
  queryFn: () => listMySubscribers(),
});

export const Route = createFileRoute("/_authenticated/follow")({
  head: () => ({
    meta: [
      { title: "Meus assinantes · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(subscribersQueryOptions),
  pendingComponent: FollowPending,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-destructive" role="alert">
      Erro ao carregar assinantes: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center text-sm text-muted-foreground">Nada por aqui.</div>
  ),
  component: FollowPage,
});

function FollowShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-card" />
      <header className="relative z-10 border-b border-border bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">Meus assinantes</h1>
          <span className="w-9" />
        </div>
      </header>
      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
        {children}
      </main>
    </div>
  );
}

function FollowPending() {
  return (
    <FollowShell>
      <Skeleton className="h-12 w-full rounded-md" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </FollowShell>
  );
}

function FollowPage() {
  const navigate = useNavigate();
  const fn = useServerFn(listMySubscribers);
  const { data } = useSuspenseQuery({
    ...subscribersQueryOptions,
    queryFn: () => fn(),
  });
  const [query, setQuery] = useState("");
  const deferredQ = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQ.trim().toLowerCase();
    if (!q) return data;
    return data.filter(s =>
      (s.username ?? "").toLowerCase().includes(q) ||
      (s.displayName ?? "").toLowerCase().includes(q),
    );
  }, [data, deferredQ]);

  return (
    <FollowShell>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca"
          className="pl-11 h-12 rounded-md"
        />
      </div>

      {data.length === 0 ? (
        <p className="text-center text-base font-bold text-foreground">
          Você ainda não tem assinantes.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-base font-bold text-foreground">
          Sem resultados para sua pesquisa.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "assinante" : "assinantes"}
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-background">
            {filtered.map((s) => {
              const name = s.displayName || s.username || "Assinante";
              const initial = name.slice(0, 1).toUpperCase();
              const clickable = !!s.username;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && navigate({ to: "/perfil/$username", params: { username: s.username! } })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                      {s.avatarUrl ? (
                        <img src={s.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initial
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{name}</p>
                      {s.username && (
                        <p className="text-xs text-muted-foreground truncate">@{s.username}</p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </FollowShell>
  );
}
