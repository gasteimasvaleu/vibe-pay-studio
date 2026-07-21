import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/two-factor/setup")({
  head: () => ({
    meta: [
      { title: "Configurar 2FA · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TwoFactorSetupPage,
});

function TwoFactorSetupPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const [qrSvg, setQrSvg] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const cleanupOnUnmountRef = useRef<string | null>(null);
  const advancedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Clean up any leftover unverified TOTP factors
        const { data: list } = await supabase.auth.mfa.listFactors();
        const orphans = (list?.totp ?? []).filter((f) => f.status !== "verified");
        for (const f of orphans) {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }

        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: `Monetisexy ${new Date().toISOString()}`,
        });
        if (error) throw error;
        if (cancelled) {
          await supabase.auth.mfa.unenroll({ factorId: data.id });
          return;
        }
        setFactorId(data.id);
        setSecret(data.totp.secret);
        setQrSvg(data.totp.qr_code);
        cleanupOnUnmountRef.current = data.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao iniciar 2FA";
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      const id = cleanupOnUnmountRef.current;
      if (id && !advancedRef.current) {
        supabase.auth.mfa.unenroll({ factorId: id }).catch(() => {});
      }
    };
  }, []);

  const copyCode = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("Código copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const goNext = () => {
    if (!factorId) return;
    advancedRef.current = true;
    navigate({ to: "/settings/two-factor/verify", search: { factorId } });
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
            Autenticação de Dois Fatores
          </h1>
          <span className="w-9" />
        </div>
        {/* Progress bar step 1/2 (roxa) */}
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-primary" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-28 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Escaneie o QR Code abaixo
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Use qualquer app autenticador (Google Authenticator, Authy, 1Password,
            Microsoft Authenticator, Duo Mobile, etc.) para escanear o QR Code
            ou insira o código manualmente.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="bg-card p-4 rounded-2xl shadow-card">
            {qrSvg ? (
              <img
                src={qrSvg}
                alt="QR Code de autenticação"
                className="h-64 w-64"
              />
            ) : (
              <div className="h-64 w-64 animate-pulse bg-muted rounded-md" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-muted px-5 py-3">
          <span className="flex-1 truncate text-sm text-foreground font-mono">
            {secret || (loading ? "Gerando…" : "—")}
          </span>
          <button
            type="button"
            onClick={copyCode}
            disabled={!secret}
            className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground transition-colors shrink-0 disabled:opacity-50"
            aria-label="Copiar código"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3 z-20">
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={copyCode}
            disabled={!secret}
            className="rounded-md"
          >
            Copiar Código
          </Button>
          <Button
            type="button"
            onClick={goNext}
            disabled={!factorId || loading}
            className="rounded-md bg-gradient-primary text-primary-foreground"
          >
            Avançar
          </Button>
        </div>
      </div>
    </div>
  );
}
