import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/settings/two-factor/")({
  head: () => ({
    meta: [
      { title: "Autenticação de Dois Fatores · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TwoFactorPage,
});

function TwoFactorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);
  const [activeCreatedAt, setActiveCreatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp ?? []).find((f) => f.status === "verified");
      setActiveFactorId(verified?.id ?? null);
      setActiveCreatedAt(verified?.created_at ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const remove = async () => {
    if (!activeFactorId || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: activeFactorId,
      });
      if (error) throw error;
      toast.success("2FA removido");
      setConfirmOpen(false);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao remover";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const isActive = !!activeFactorId;
  const createdLabel = activeCreatedAt
    ? new Date(activeCreatedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

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
            Autenticação de Dois Fatores
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-4">
          <h2 className="text-base font-bold text-foreground">Status</h2>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                loading
                  ? "bg-muted-foreground"
                  : isActive
                    ? "bg-primary"
                    : "bg-destructive"
              }`}
              aria-hidden
            />
            <span className="text-base text-foreground">
              {loading ? "Carregando…" : isActive ? "Ativa" : "Não configurada"}
            </span>
          </div>
          {isActive && createdLabel ? (
            <p className="text-xs text-muted-foreground">
              Adicionada em {createdLabel}
            </p>
          ) : null}
          {!loading && !isActive ? (
            <Link
              to="/settings/two-factor/setup"
              className="flex items-center justify-center w-full h-12 rounded-md bg-gradient-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Habilitar
            </Link>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Compatível com qualquer app TOTP: Google Authenticator, Authy,
            1Password, Microsoft Authenticator, Duo Mobile, etc.
          </p>
        </div>

        {!loading && isActive ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Remover autenticação de dois fatores
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Isso desativa o 2FA e remove o app autenticador da sua conta.
                Você poderá cadastrar novamente a qualquer momento.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
              className="w-full h-12 rounded-md"
            >
              Remover 2FA
            </Button>
          </div>
        ) : null}
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover 2FA?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a autenticação de dois fatores?
              Sua conta ficará protegida apenas pela senha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
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
