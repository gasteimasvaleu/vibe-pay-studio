import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Info, UserPlus, Search, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  listRestrictedSubscribers,
  restrictSubscriber,
  unrestrictSubscriber,
  searchSubscribersToRestrict,
  type RestrictedSubscriber,
  type SubscriberCandidate,
} from "@/lib/restrictions.functions";

export const Route = createFileRoute("/_authenticated/settings/restrictions")({
  head: () => ({
    meta: [
      { title: "Assinantes restritos · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: RestrictionsPage,
});

function RestrictionsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [infoOpen, setInfoOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const listFn = useServerFn(listRestrictedSubscribers);
  const unrestrictFn = useServerFn(unrestrictSubscriber);

  const listQuery = useQuery({
    queryKey: ["restricted-subscribers"],
    queryFn: () => listFn(),
  });

  const unrestrictMutation = useMutation({
    mutationFn: (subscriberId: string) =>
      unrestrictFn({ data: { subscriberId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restricted-subscribers"] });
      toast.success("Assinante desrestringido");
    },
    onError: (e: Error) => toast.error(e.message ?? "Falha ao desrestringir"),
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Assinantes restritos
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Restringir assinante"
            >
              <UserPlus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Mais informações"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        {listQuery.isLoading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Assinantes restritos não podem interagir com você e novas mensagens
            vindas dele não serão exibidas.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <RestrictedRow
                key={r.userId}
                row={r}
                onUnrestrict={() => unrestrictMutation.mutate(r.userId)}
                pending={
                  unrestrictMutation.isPending &&
                  unrestrictMutation.variables === r.userId
                }
              />
            ))}
          </ul>
        )}
      </main>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assinantes restritos</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border p-4 space-y-4">
            <p className="font-bold text-foreground">
              O que ocorre ao restringir um perfil?
            </p>
            <ol className="list-decimal pl-5 space-y-3 text-foreground">
              <li>O assinante não pode mais interagir com você.</li>
              <li>Comentários dele não aparecem em suas publicações.</li>
              <li>Mensagens enviadas por ele não são recebidas por você.</li>
              <li>O assinante não é notificado sobre essa restrição.</li>
            </ol>
          </div>
          <Button
            className="w-full rounded-md"
            onClick={() => setInfoOpen(false)}
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>

      <AddRestrictionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onRestricted={() =>
          qc.invalidateQueries({ queryKey: ["restricted-subscribers"] })
        }
      />
    </div>
  );
}

function RestrictedRow({
  row,
  onUnrestrict,
  pending,
}: {
  row: RestrictedSubscriber;
  onUnrestrict: () => void;
  pending: boolean;
}) {
  const initials = (row.displayName ?? row.username).slice(0, 2).toUpperCase();
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="h-11 w-11 rounded-full overflow-hidden bg-muted grid place-items-center text-sm font-semibold text-muted-foreground">
        {row.avatarUrl ? (
          <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {row.displayName ?? row.username}
        </p>
        <p className="text-xs text-muted-foreground truncate">@{row.username}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onUnrestrict}
        disabled={pending}
        className="rounded-full"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          "Desrestringir"
        )}
      </Button>
    </li>
  );
}

function AddRestrictionDialog({
  open,
  onClose,
  onRestricted,
}: {
  open: boolean;
  onClose: () => void;
  onRestricted: () => void;
}) {
  const [q, setQ] = useState("");
  const debounced = useDebounced(q, 250);

  const searchFn = useServerFn(searchSubscribersToRestrict);
  const restrictFn = useServerFn(restrictSubscriber);

  const searchQuery = useQuery({
    queryKey: ["subscribers-to-restrict", debounced],
    queryFn: () => searchFn({ data: { q: debounced } }),
    enabled: open && debounced.trim().length > 0,
  });

  const restrictMutation = useMutation({
    mutationFn: (subscriberId: string) =>
      restrictFn({ data: { subscriberId } }),
    onSuccess: () => {
      toast.success("Assinante restringido");
      onRestricted();
      setQ("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message ?? "Falha ao restringir"),
  });

  const results = searchQuery.data ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setQ("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restringir assinante</DialogTitle>
          <DialogDescription>
            Busque por @username entre seus assinantes ativos.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="@username"
            className="w-full h-11 rounded-md border border-border bg-background pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-full text-muted-foreground hover:bg-accent"
              aria-label="Limpar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="min-h-[120px] max-h-72 overflow-y-auto -mx-2 px-2">
          {debounced.trim().length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Digite um @username para buscar.
            </p>
          ) : searchQuery.isLoading ? (
            <div className="grid place-items-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhum assinante ativo encontrado.
            </p>
          ) : (
            <ul className="space-y-1">
              {results.map((s) => (
                <CandidateRow
                  key={s.userId}
                  s={s}
                  onSelect={() => restrictMutation.mutate(s.userId)}
                  pending={
                    restrictMutation.isPending &&
                    restrictMutation.variables === s.userId
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CandidateRow({
  s,
  onSelect,
  pending,
}: {
  s: SubscriberCandidate;
  onSelect: () => void;
  pending: boolean;
}) {
  const initials = (s.displayName ?? s.username).slice(0, 2).toUpperCase();
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={pending}
        className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors text-left disabled:opacity-60"
      >
        <div className="h-9 w-9 rounded-full overflow-hidden bg-muted grid place-items-center text-xs font-semibold text-muted-foreground">
          {s.avatarUrl ? (
            <img src={s.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {s.displayName ?? s.username}
          </p>
          <p className="text-xs text-muted-foreground truncate">@{s.username}</p>
        </div>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <span className="text-xs font-medium text-primary">Restringir</span>
        )}
      </button>
    </li>
  );
}

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useMemoDebounce(() => setV(value), [value], delay);
  return v;
}

function useMemoDebounce(fn: () => void, deps: unknown[], delay: number) {
  useMemo(() => {
    const id = window.setTimeout(fn, delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
