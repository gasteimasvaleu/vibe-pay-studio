import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/two-factor/verify")({
  head: () => ({
    meta: [
      { title: "Verificar 2FA · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: z.object({ factorId: z.string().min(1) }),
  component: TwoFactorVerifyPage,
});

function TwoFactorVerifyPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const { factorId } = Route.useSearch();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    try {
      const { data: challenge, error: cErr } =
        await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) throw vErr;
      toast.success("Autenticação de dois fatores habilitada");
      navigate({ to: "/settings/two-factor" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Código inválido";
      toast.error(msg);
      setCode("");
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
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
            Autenticação de Dois Fatores
          </h1>
          <span className="w-9" />
        </div>
        {/* Progress bar step 2/2 (roxa) */}
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full w-full bg-gradient-primary" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-28 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Insira o código de validação
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Digite o código gerado pelo seu aplicativo autenticador para
            prosseguir na autenticação
          </p>
        </div>

        <label className="relative flex items-center gap-3 rounded-full bg-muted px-5 py-3">
          <div className="flex-1 flex flex-col">
            <span className="text-xs text-muted-foreground">
              Código de validação
            </span>
            <input
              ref={inputRef}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerify();
              }}
              placeholder="000000"
              className="bg-transparent outline-none text-lg font-mono tracking-widest text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
          <QrCode className="h-6 w-6 text-muted-foreground shrink-0" />
        </label>
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3 z-20">
        <div className="max-w-3xl mx-auto">
          <Button
            type="button"
            onClick={handleVerify}
            disabled={code.length !== 6 || verifying}
            className="h-12 w-full rounded-md bg-gradient-primary text-primary-foreground"
          >
            {verifying ? "Verificando…" : "Habilitar Autenticação"}
          </Button>
        </div>
      </div>
    </div>
  );
}
