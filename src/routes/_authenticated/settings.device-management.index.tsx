import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ChevronRight,
  Laptop,
  MoreVertical,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listMySessions,
  revokeAllOtherSessions,
  revokeSession,
  type DeviceSession,
} from "@/lib/sessions.functions";
import { parseUA, formatDate } from "@/lib/session-format";

export const Route = createFileRoute(
  "/_authenticated/settings/device-management/",
)({
  head: () => ({
    meta: [
      { title: "Seus acessos · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: () => listMySessions(),
  component: DeviceManagementPage,
});




function DeviceManagementPage() {
  const router = useRouter();
  const sessions = Route.useLoaderData() as DeviceSession[];
  const current = sessions.find((s) => s.isCurrent) ?? null;
  const others = sessions.filter((s) => !s.isCurrent);

  const [showAll, setShowAll] = useState(false);
  const [toRevoke, setToRevoke] = useState<DeviceSession | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const doRevoke = useServerFn(revokeSession);
  const doRevokeAll = useServerFn(revokeAllOtherSessions);

  const visible = showAll ? others : others.slice(0, 2);
  const hasMore = others.length > 2;

  const handleRevoke = async () => {
    if (!toRevoke || busy) return;
    setBusy(true);
    try {
      await doRevoke({ data: { sessionId: toRevoke.id } });
      toast.success("Acesso removido");
      setToRevoke(null);
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover");
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await doRevokeAll();
      toast.success("Todos os outros acessos foram removidos");
      setConfirmAll(false);
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-card">
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
            Seus acessos
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">
            Acessos conectados
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Estes são todos os acessos conectados à sua conta. Caso não
            reconheça algum deles, remova todos os acessos e{" "}
            <Link
              to="/settings/change-password"
              className="underline text-muted-foreground hover:text-foreground"
            >
              troque sua senha
            </Link>{" "}
            para mais segurança.
          </p>
        </section>

        {current ? (
          <section className="space-y-3">
            <h3 className="text-base font-bold text-foreground">
              Acesso atual
            </h3>
            <SessionCard session={current} isCurrent />
          </section>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground">
            Outros acessos
          </h3>
          {others.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
              Nenhum outro acesso ativo.
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onRevoke={() => setToRevoke(s)}
                />
              ))}
            </div>
          )}
        </section>

        {hasMore && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-accent transition-colors text-base font-semibold text-foreground text-center"
          >
            Ver mais
          </button>
        )}

        {others.length > 0 ? (
          <button
            type="button"
            onClick={() => setConfirmAll(true)}
            className="w-full rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-accent transition-colors text-base font-semibold text-destructive text-center"
          >
            Remover todos os acessos
          </button>
        ) : null}

        <Link
          to="/settings/device-management/removed"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-accent transition-colors w-full text-left"
        >
          <span className="flex-1 text-base text-foreground">
            Ver acessos removidos
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <p className="text-xs text-muted-foreground">
          Localização por IP indisponível.
        </p>
      </main>

      <AlertDialog
        open={!!toRevoke}
        onOpenChange={(o) => (!o ? setToRevoke(null) : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              A sessão será encerrada imediatamente e o dispositivo precisará
              entrar novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRevoke();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover todos os outros acessos?</AlertDialogTitle>
            <AlertDialogDescription>
              O acesso atual continuará ativo. Todos os outros dispositivos
              serão desconectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRevokeAll();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Removendo…" : "Remover todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SessionCard({
  session,
  isCurrent,
  onRevoke,
}: {
  session: DeviceSession;
  isCurrent?: boolean;
  onRevoke?: () => void;
}) {
  const ua = parseUA(session.userAgent);
  const Icon =
    ua.kind === "mobile" ? Smartphone : ua.kind === "tablet" ? Tablet : Laptop;
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="h-10 w-10 grid place-items-center text-muted-foreground shrink-0">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-foreground">
          {ua.browser} · {ua.os}
        </p>
        <p className="text-sm text-foreground">
          Ativo em {formatDate(session.refreshedAt)}
        </p>
        <p className="text-sm text-muted-foreground">
          Entrou em {formatDate(session.createdAt)}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {session.ip ?? "IP indisponível"}
        </p>
      </div>
      {!isCurrent && onRevoke ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Opções"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={onRevoke}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover acesso
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          Atual
        </span>
      )}
    </div>
  );
}
