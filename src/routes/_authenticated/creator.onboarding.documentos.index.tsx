import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ShieldCheck, Lock, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { createIdentityVerificationSession } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/creator/onboarding/documentos/")({
  head: () => ({
    meta: [
      { title: "Verificação de Documentos · Monetisexy" },
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

  const handleStart = async () => {
    setError(null);
    setLoading(true);

    try {
      const returnUrl = `${window.location.origin}/creator/onboarding/documentos/veriff-concluido`;
      const result = await createSession({ data: { return_url: returnUrl } });
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }

      const url = result.url ?? returnUrl;
      const veriffWindow = window.open(url, "_blank");

      if (veriffWindow) {
        veriffWindow.opener = null;
        navigate({ to: "/creator/onboarding/documentos/verificando" });
      } else {
        window.location.href = url;
      }
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
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">
          Verificação de documentos
        </h2>
        <p className="mt-3 text-neutral-700 leading-relaxed">
          Faltam poucos passos para você se tornar um(a) creator Monetisexy.
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
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="mt-10 w-full py-3.5 rounded-md bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-400 text-white font-semibold shadow-glow hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Preparando..." : "Iniciar verificação"}
        </button>

        <p className="mt-4 text-center text-xs text-neutral-500">
          Você será redirecionado para o ambiente seguro da Veriff.
        </p>
      </div>
    </OnboardingShell>
  );
}

function Bullet({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <span className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-xl bg-fuchsia-100 border border-fuchsia-200 text-fuchsia-600">
        {icon}
      </span>
      <p className="text-sm text-neutral-700 leading-relaxed">{children}</p>
    </div>
  );
}
