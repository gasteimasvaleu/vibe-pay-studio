import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Info, Search, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listMuted, unmuteProfile } from "@/lib/mutes.functions";

export const Route = createFileRoute("/_authenticated/settings/muted")({
  head: () => ({
    meta: [
      { title: "Perfis silenciados · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: MutedPage,
});

function MutedPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const listFn = useServerFn(listMuted);
  const unmuteFn = useServerFn(unmuteProfile);

  const { data = [], isLoading } = useQuery({
    queryKey: ["mutes", "list"],
    queryFn: () => listFn(),
  });

  const unmute = useMutation({
    mutationFn: (userId: string) => unmuteFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Perfil não está mais silenciado.");
      void qc.invalidateQueries({ queryKey: ["mutes"] });
      void qc.invalidateQueries({ queryKey: ["chat", "threads"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao remover"),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (r) =>
        r.username.toLowerCase().includes(term) ||
        (r.displayName ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

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
            Perfis silenciados
          </h1>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Mais informações"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Mensagens de perfis silenciados não geram notificações e ficam ocultas
          da lista principal do chat. Ative o filtro <strong>Silenciados</strong> no
          chat para visualizá-las.
        </p>

        {data.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar silenciados..."
              className="pl-9"
            />
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {data.length === 0
                ? "Você ainda não silenciou nenhum perfil."
                : "Nenhum resultado."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <li key={r.id} className="flex items-center gap-3 p-3">
                  <div className="h-11 w-11 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-700 grid place-items-center text-white text-sm font-bold shrink-0">
                    {r.avatarUrl ? (
                      <img
                        src={r.avatarUrl}
                        alt={r.displayName ?? r.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{(r.displayName ?? r.username).slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                      <VolumeX className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {r.displayName ?? r.username}
                    </div>
                    <Link
                      to="/perfil/$username"
                      params={{ username: r.username }}
                      className="text-xs text-muted-foreground hover:text-primary truncate block"
                    >
                      @{r.username}
                    </Link>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unmute.isPending}
                    onClick={() => unmute.mutate(r.userId)}
                  >
                    Deixar de silenciar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Perfis silenciados</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border p-4 space-y-4">
            <p className="font-bold text-foreground">
              O que acontece quando você silencia um perfil?
            </p>
            <ol className="list-decimal pl-5 space-y-3 text-foreground">
              <li>Mensagens recebidas não serão notificadas.</li>
              <li>A conversa fica oculta da lista principal e aparece no filtro "Silenciados".</li>
              <li>
                O outro usuário não é avisado — a ação é privada e só você
                enxerga.
              </li>
              <li>
                Silenciar é diferente de restringir: o perfil silenciado ainda
                pode interagir com você normalmente.
              </li>
            </ol>
          </div>
          <Button className="w-full rounded-md" onClick={() => setOpen(false)}>
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
