import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Lock, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { createIdentityVerificationSession } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/creator/onboarding/documentos")({
  head: () => ({
    meta: [
      { title: "Verificação de Documentos · Monetisex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocumentosPage,
});

function DocumentosPage() {
  const navigate = useNavigate();
  const createSession = useServerFn(createIdentityVerificationSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [veriffUrl, setVeriffUrl] = useState<string | null>(null);

  const openVeriff = (url: string) => {
    // Tenta escapar do iframe do preview (saas.veriff.com bloqueia X-Frame).
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
        return;
      }
    } catch {
      // cross-origin: cai para nova aba abaixo
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      // Pop-up bloqueado — navega a própria janela como último recurso.
      window.location.href = url;
    }
  };

  const handleStart = async () => {
    setError(null);
    setLoading(true);
    try {
      const returnUrl = `${window.location.origin}/creator/onboarding/documentos/verificando`;
      const result = await createSession({ data: { return_url: returnUrl } });
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }
      const url = result.url ?? returnUrl;
      setVeriffUrl(url);
      openVeriff(url);
      // Manda a app para a tela de polling — quando o usuário voltar da Veriff, já está pronta.
      navigate({ to: "/creator/onboarding/documentos/verificando" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar verificação.");
      setLoading(false);
    }
  };

  return (
    <OnboardingShell
      title="Verificação de documentos"
      step={3}
      backTo="/creator/onboarding/assinatura"
    >
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight">
          Verificação de documentos
        </h2>
        <p className="mt-3 text-white/70 leading-relaxed">
          Faltam poucos passos para você se tornar um(a) creator Monetisex.
          Precisamos apenas validar alguns documentos — o processo é rápido,
          seguro e sigiloso, feito em parceria com a Veriff.
        </p>

        <div className="mt-8 space-y-3">
          <Bullet icon={<Lock className="w-4 h-4" />}>
            Seus dados são criptografados e nunca ficam expostos publicamente.
          </Bullet>
          <Bullet icon={<Clock className="w-4 h-4" />}>
            Leva menos de 5 minutos — documento com foto e uma selfie.
          </Bullet>
          <Bullet icon={<ShieldCheck className="w-4 h-4" />}>
            Após aprovado, você libera pagamentos e monetização.
          </Bullet>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="ml-2 underline"
            >
              Voltar ao painel
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="mt-10 w-full py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Preparando..." : "Iniciar verificação"}
        </button>

        {veriffUrl ? (
          <p className="mt-4 text-center text-xs text-white/60">
            Não abriu?{" "}
            <a
              href={veriffUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fuchsia-300 underline underline-offset-4 hover:text-fuchsia-200"
            >
              Abrir verificação em nova aba
            </a>
          </p>
        ) : (
          <p className="mt-4 text-center text-xs text-white/40">
            Você será redirecionado para o ambiente seguro da Veriff.
          </p>
        )}
      </div>
    </OnboardingShell>
  );
}

function Bullet({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
      <span className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300">
        {icon}
      </span>
      <p className="text-sm text-white/80 leading-relaxed">{children}</p>
    </div>
  );
}
