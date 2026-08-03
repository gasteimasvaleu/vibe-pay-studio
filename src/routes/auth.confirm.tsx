import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  token_hash: z.string().optional(),
  type: z.string().optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Confirmando e-mail · Monetisexy" }],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token_hash, type, next } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token_hash || !type) {
        setError("Link inválido ou incompleto.");
        setStatus("error");
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: type as any,
        token_hash,
      });
      if (cancelled) return;
      if (error) {
        setError(
          error.message.toLowerCase().includes("expired")
            ? "Este link expirou. Solicite um novo e-mail de confirmação."
            : "Não foi possível confirmar seu e-mail. Tente novamente.",
        );
        setStatus("error");
        return;
      }
      if (next && next.startsWith("/")) {
        navigate({ to: next, replace: true });
        return;
      }
      let step: string | null = null;
      try {
        const { resolveCreatorOnboardingStep } = await import("@/lib/onboarding-step");
        step = await resolveCreatorOnboardingStep();
      } catch {
        step = null;
      }
      navigate({ to: step ?? "/feed", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [token_hash, type, next, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center">
        {status === "loading" ? (
          <>
            <h1 className="text-xl font-black">Confirmando seu e-mail…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Aguarde um instante.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-black">Não foi possível confirmar</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link
              to="/entrar"
              className="mt-6 inline-block px-4 py-2 rounded-md bg-gradient-primary text-primary-foreground font-semibold"
            >
              Ir para o login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
