import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { completeOnboarding, getKycStatus } from "@/lib/onboarding.functions";
import mosaicImg from "@/assets/onboarding-verificando.jpg";

export const Route = createFileRoute(
  "/_authenticated/creator/onboarding/documentos/verificando",
)({
  head: () => ({
    meta: [
      { title: "Validando · Monetisex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificandoPage,
});

type KycStatus = "not_started" | "processing" | "verified" | "requires_input" | "canceled";

function VerificandoPage() {
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getKycStatus);
  const finish = useServerFn(completeOnboarding);
  const [status, setStatus] = useState<KycStatus>("processing");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const r = await fetchStatus();
        if (!mounted) return;
        setStatus(r.status);
        if (r.status === "verified" && !completed) {
          setCompleted(true);
          try {
            await finish();
          } catch {
            // ignore — usuário ainda vê a tela de aprovado
          }
          navigate({ to: "/creator/onboarding/documentos/aprovado" });
          return;
        }
        if (r.status === "processing") {
          timer = setTimeout(poll, 8000);
        }
      } catch {
        timer = setTimeout(poll, 12000);
      }
    };
    void poll();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [fetchStatus, finish, completed, navigate]);

  const banner = (() => {
    if (status === "verified") {
      return {
        color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
        icon: <CheckCircle2 className="w-5 h-5" />,
        text: "Sua identidade foi verificada. Bem-vindo(a) à Monetisex!",
      };
    }
    if (status === "requires_input") {
      return {
        color: "border-amber-500/40 bg-amber-500/10 text-amber-200",
        icon: <AlertTriangle className="w-5 h-5" />,
        text: "Precisamos de mais informações. Você pode reenviar seus documentos.",
      };
    }
    if (status === "canceled") {
      return {
        color: "border-red-500/40 bg-red-500/10 text-red-200",
        icon: <AlertTriangle className="w-5 h-5" />,
        text: "Verificação cancelada. Tente novamente quando quiser.",
      };
    }
    return {
      color: "border-white/10 bg-white/5 text-white/80",
      icon: <Loader2 className="w-5 h-5 animate-spin" />,
      text: "Validando seus documentos... isso leva alguns minutos.",
    };
  })();

  return (
    <OnboardingShell title="Verificação de documentos" step={3} backTo="/creator">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
          Tudo pronto! Agora só esperar enquanto cuidamos do resto.
        </h2>

        <div className="mt-8 mx-auto max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-glow">
          <img
            src={mosaicImg}
            alt="Creators da Monetisex"
            width={1024}
            height={1024}
            loading="lazy"
            className="w-full h-auto"
          />
        </div>

        <div
          className={`mt-8 mx-auto max-w-lg flex items-start gap-3 rounded-2xl border p-4 text-sm text-left ${banner.color}`}
        >
          <span className="mt-0.5">{banner.icon}</span>
          <p className="flex-1">{banner.text}</p>
        </div>

        <p className="mt-6 text-sm text-white/60 max-w-lg mx-auto">
          Estamos validando os dados informados. Avisaremos nos próximos minutos
          o resultado — enquanto isso, aproveite para explorar a Monetisex.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate({ to: "/creator" })}
            className="px-8 py-3 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition"
          >
            Ir para o painel
          </button>
          {status === "requires_input" || status === "canceled" ? (
            <button
              type="button"
              onClick={() => navigate({ to: "/creator/onboarding/documentos" })}
              className="px-8 py-3 rounded-full border border-white/15 text-sm font-medium hover:bg-white/5 transition"
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      </div>
    </OnboardingShell>
  );
}
