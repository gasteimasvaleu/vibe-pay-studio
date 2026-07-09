import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

  const reserveVeriffTab = () => {
    const tab = window.open("about:blank", "_blank");
    if (tab) {
      tab.opener = null;
    }
    return tab;
  };

  const handleStart = async () => {
    const veriffTab = reserveVeriffTab();
    navigate({ to: "/creator/onboarding/documentos/verificando" });

    try {
      const returnUrl = `${window.location.origin}/creator/onboarding/documentos/verificando`;
      const result = await createSession({ data: { return_url: returnUrl } });
      if (!result.ok) {
        veriffTab?.close();
        console.error(result.message);
        return;
      }
      const url = result.url ?? returnUrl;
      if (veriffTab) {
        veriffTab.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      veriffTab?.close();
      console.error(err instanceof Error ? err.message : "Erro ao iniciar verificação.");
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

        <button
          type="button"
          onClick={handleStart}
          className="mt-10 w-full py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition disabled:opacity-50"
        >
          Iniciar verificação
        </button>

        <p className="mt-4 text-center text-xs text-white/40">
          Você será redirecionado para o ambiente seguro da Veriff.
        </p>
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
