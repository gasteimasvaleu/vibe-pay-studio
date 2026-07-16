import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/Layout";
import { getAuthErrorMessage, routeAfterAuth } from "@/lib/auth";

const searchSchema = z.object({
  email: z.string().email().optional(),
});

export const Route = createFileRoute("/cadastro/confirme-email")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Confirme seu e-mail · Monetisexy" },
      { name: "description", content: "Confirme seu e-mail para ativar sua conta na Monetisexy." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmeEmailPage,
});

function ConfirmeEmailPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleAlreadyConfirmed = async () => {
    setErrorMsg(null);
    setInfo(null);
    setChecking(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setInfo("Ainda não detectamos a confirmação. Tente novamente em instantes.");
        return;
      }
      if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
        setInfo("Ainda não detectamos a confirmação. Abra o link do e-mail e tente novamente.");
        return;
      }
      await routeAfterAuth(navigate);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? getAuthErrorMessage(err.message) : "Não foi possível verificar.",
      );
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setErrorMsg("Não temos seu e-mail para reenviar. Faça o cadastro novamente.");
      return;
    }
    if (cooldown > 0) return;
    setErrorMsg(null);
    setInfo(null);
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        setErrorMsg(getAuthErrorMessage(error.message));
        return;
      }
      setInfo("Enviamos um novo e-mail. Confira sua caixa de entrada e o spam.");
      setCooldown(30);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? getAuthErrorMessage(err.message) : "Não foi possível reenviar.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SiteLayout>
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-border bg-surface p-6 md:p-10 text-center">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Confirme seu e-mail
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {email ? (
                <>
                  Enviamos um link de confirmação para{" "}
                  <strong className="text-foreground break-all">{email}</strong>. Abra o link para
                  ativar sua conta.
                </>
              ) : (
                <>Abra o link que enviamos para ativar sua conta.</>
              )}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Não esqueça de checar a caixa de spam.
            </p>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={handleAlreadyConfirmed}
                disabled={checking}
                className="w-full py-3 rounded-md bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checking ? "Verificando..." : "Já confirmei"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0 || !email}
                className="w-full py-3 rounded-md border border-border hover:border-foreground bg-background font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resending
                  ? "Reenviando..."
                  : cooldown > 0
                    ? `Reenviar em ${cooldown}s`
                    : "Reenviar e-mail"}
              </button>
            </div>

            {info && (
              <p role="status" className="mt-4 text-sm text-primary">
                {info}
              </p>
            )}
            {errorMsg && (
              <p role="alert" className="mt-4 text-sm text-red-500">
                {errorMsg}
              </p>
            )}

            <p className="mt-8 text-sm text-muted-foreground">
              <Link to="/cadastro" className="text-primary hover:underline font-semibold">
                Usar outro e-mail
              </Link>
            </p>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
