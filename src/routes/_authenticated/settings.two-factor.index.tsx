import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp ?? []).find((f) => f.status === "verified");
      setActiveFactorId(verified?.id ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const disable = async () => {
    if (!activeFactorId || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: activeFactorId,
      });
      if (error) throw error;
      toast.success("2FA desativado");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao desativar";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const isActive = !!activeFactorId;

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

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
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
          {!loading && isActive ? (
            <Button
              type="button"
              variant="outline"
              onClick={disable}
              disabled={busy}
              className="w-full h-12 rounded-md"
            >
              {busy ? "Desativando…" : "Desativar"}
            </Button>
          ) : (
            <Link
              to="/settings/two-factor/setup"
              className="flex items-center justify-center w-full h-12 rounded-md bg-gradient-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Habilitar
            </Link>
          )}
          <p className="text-xs text-muted-foreground">
            Compatível com qualquer app TOTP: Google Authenticator, Authy,
            1Password, Microsoft Authenticator, Duo Mobile, etc.
          </p>
        </div>
      </main>
    </div>
  );
}
