import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/Layout";
import { getAuthErrorMessage, routeAfterAuth } from "@/lib/auth";
import { checkEmailConfirmed } from "@/lib/auth-confirm.functions";

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
  const doneRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  /**
   * Retorna true se a confirmação foi detectada (e a navegação já foi disparada).
   * 1) Sessão local (link aberto neste mesmo navegador) → entra direto no app.
   * 2) Sem sessão (link aberto no celular) → consulta pelo e-mail no servidor
   *    e manda para o login com o e-mail preenchido.
   */
  const detectConfirmation = useCallback(async (): Promise<boolean> => {
    if (doneRef.current) return true;

    const { data } = await supabase.auth.getUser();
    if (data.user?.email_confirmed_at || data.user?.confirmed_at) {
      doneRef.current = true;
      await routeAfterAuth(navigate);
      return true;
    }

    if (!email) return false;
    const res = await checkEmailConfirmed({ data: { email } });
    if (res.confirmed) {
      doneRef.current = true;
      navigate({ to: "/entrar", search: { email, confirmado: true }, replace: true });
      return true;
    }
    return false;
  }, [email, navigate]);

  // Verificação automática enquanto a página estiver aberta (até ~5 min).
  useEffect(() => {
    let mounted = true;
    let elapsed = 0;
    const tick = async () => {
      if (!mounted || document.hidden) return;
      try {
        await detectConfirmation();
      } catch {
        /* silencioso */
      }
    };
    void tick();
    const id = setInterval(() => {
      elapsed += 5000;
      if (elapsed > 5 * 60_000 || doneRef.current) {
        clearInterval(id);
        return;
      }
      void tick();
    }, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [detectConfirmation]);

  const handleAlreadyConfirmed = async () => {
    setErrorMsg(null);
    setInfo(null);
    setChecking(true);
    try {
      const ok = await detectConfirmation();
      if (!ok) {
        setInfo("Ainda não detectamos a confirmação. Abra o link do e-mail e tente novamente.");
      }
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
      console.info("[confirme-email] reenviando confirmação para", email);
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        console.error("[confirme-email] erro no resend:", error.name, error.message, error.status);
        setErrorMsg(getAuthErrorMessage(error.message));
        return;
      }
      console.info("[confirme-email] reenvio bem-sucedido");
      setInfo("Enviamos um novo e-mail. Confira sua caixa de entrada e o spam.");
      setCooldown(30);
    } catch (err) {
      console.error("[confirme-email] exceção no resend:", err);
      setErrorMsg(
        err instanceof Error ? getAuthErrorMessage(err.message) : "Não foi possível reenviar.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SiteLayout>
      <div className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          <div className="rounded-3xl overflow-hidden shadow-card border border-slate-200 bg-white flex flex-col md:flex-row">
            {/* Imagem */}
            <div className="bg-white md:w-1/2 md:flex-shrink-0 border-b border-slate-200 md:border-b-0 md:border-r">
              <img
                src="https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/gpt-image-2-1%20(1).png"
                alt=""
                className="md:hidden w-full aspect-[16/9] object-cover"
              />
              <img
                src="https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/gpt-image-2-1.png"
                alt=""
                className="hidden md:block w-full aspect-square object-cover"
              />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 p-6 md:p-10 text-center bg-white">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                Confirme seu e-mail
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                {email ? (
                  <>
                    Enviamos um link de confirmação para{" "}
                    <strong className="text-slate-900 break-all">{email}</strong>. Abra o link para
                    ativar sua conta.
                  </>
                ) : (
                  <>Abra o link que enviamos para ativar sua conta.</>
                )}
              </p>
              <p className="mt-2 text-xs text-slate-500">
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
                  className="w-full py-3 rounded-md border border-slate-200 hover:border-slate-400 bg-white text-slate-900 font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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

              <p className="mt-8 text-sm text-slate-600">
                <Link to="/cadastro" className="text-primary hover:underline font-semibold">
                  Usar outro e-mail
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

