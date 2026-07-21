import { useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
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
import { supabase } from "@/integrations/supabase/client";
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
  revokeSession,
  type DeviceSession,
} from "@/lib/sessions.functions";
import { parseUA, formatDate } from "@/lib/session-format";

export const Route = createFileRoute("/_authenticated/settings/security-menu")({
  head: () => ({
    meta: [
      { title: "Segurança · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  loader: () => listMySessions(),
  component: SecurityMenuPage,
});

function SecurityMenuPage() {
  const router = useRouter();
  const sessions = Route.useLoaderData() as DeviceSession[];
  const soon = () => toast.info("Em breve");

  const current = sessions.find((s) => s.isCurrent) ?? null;
  const others = sessions.filter((s) => !s.isCurrent);
  const preview: DeviceSession[] = current
    ? [current, ...others].slice(0, 2)
    : others.slice(0, 2);

  const [toRevoke, setToRevoke] = useState<DeviceSession | null>(null);
  const [busy, setBusy] = useState(false);
  const doRevoke = useServerFn(revokeSession);

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
            Segurança
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-8">
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-card">
          {[
            { label: "Alterar senha", to: "/settings/change-password" },
            { label: "Autenticação de dois fatores", to: "/settings/two-factor" },
            { label: "Autenticação por rede social", to: "/settings/security" },
          ].map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className="flex items-center px-4 py-4 hover:bg-accent transition-colors w-full text-left text-base text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={soon}
                className="flex items-center px-4 py-4 hover:bg-accent transition-colors w-full text-left text-base text-foreground"
              >
                {item.label}
              </button>
            )
          )}
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Seus acessos</h2>
            <p className="text-sm text-muted-foreground">
              Acessos conectados recentemente
            </p>
          </div>

          {preview.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
              Nenhum acesso ativo.
            </div>
          ) : (
            <div className="space-y-3">
              {preview.map((s) => {
                const ua = parseUA(s.userAgent);
                const Icon =
                  ua.kind === "mobile"
                    ? Smartphone
                    : ua.kind === "tablet"
                      ? Tablet
                      : Laptop;
                return (
                  <div
                    key={s.id}
                    className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
                  >
                    <div className="h-10 w-10 grid place-items-center text-muted-foreground shrink-0">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-foreground">
                        {ua.browser} · {ua.os}
                      </p>
                      <p className="text-sm text-foreground">
                        Ativo em {formatDate(s.refreshedAt)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {s.ip ?? "IP indisponível"}
                      </p>
                    </div>
                    {s.isCurrent ? (
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Atual
                      </span>
                    ) : (
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
                            onClick={() => setToRevoke(s)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remover acesso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Link
            to="/settings/device-management"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-accent transition-colors w-full text-left"
          >
            <span className="flex-1 text-base text-foreground">Ver todos acessos</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </section>
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
    </div>
  );
}
