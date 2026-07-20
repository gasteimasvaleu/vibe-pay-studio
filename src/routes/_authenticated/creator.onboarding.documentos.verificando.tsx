import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { GooeyLoader } from "@/components/onboarding/GooeyLoader";
import { completeOnboarding, getKycStatus } from "@/lib/onboarding.functions";
import mosaicImg from "@/assets/onboarding-verificando.jpg";

export const Route = createFileRoute(
  "/_authenticated/creator/onboarding/documentos/verificando",
)({
  head: () => ({
    meta: [
      { title: "Validando · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  pendingMs: 0,
  pendingMinMs: 300,
  component: VerificandoPage,
  pendingComponent: VerificandoPending,
});

function VerificandoPending() {
  return (
    <OnboardingShell title="Verificação de documentos" step={3} backTo="/dashboard">
      <div className="mx-auto max-w-2xl text-center">
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <GooeyLoader className="h-28 w-56 text-[14px]" />
          <p className="mt-8 text-lg font-semibold text-neutral-900">
            Verificação de identidade em andamento
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">
            Isso pode demorar alguns minutos. Você será redirecionado
            automaticamente assim que for concluído.
          </p>
        </div>
      </div>
    </OnboardingShell>
  );
}

type KycStatus = "not_started" | "processing" | "verified" | "requires_input" | "canceled";

function VerificandoPage() {
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getKycStatus);
  const finish = useServerFn(completeOnboarding);
  const [status, setStatus] = useState<KycStatus>("processing");
  const [completed, setCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [checkingNow, setCheckingNow] = useState(false);
  const startedAt = useState(() => Date.now())[0];

  const runCheck = async () => {
    try {
      const r = await fetchStatus();
      setStatus(r.status);
      if (r.status === "verified" && !completed) {
        setCompleted(true);
        try {
          await finish();
        } catch {
          // ignore
        }
        navigate({ to: "/creator/onboarding/documentos/aprovado" });
        return true;
      }
    } catch (err) {
      console.warn("[verificando] check failed", err);
    }
    return false;
  };

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (!mounted) return;
      const done = await runCheck();
      if (!mounted || done) return;
      // Adaptive: 3s no primeiro minuto, 8s depois
      const age = Date.now() - startedAt;
      const delay = age < 60_000 ? 3000 : 8000;
      timer = setTimeout(tick, delay);
    };
    void tick();

    const elapsedTimer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      clearInterval(elapsedTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckNow = async () => {
    setCheckingNow(true);
    try {
      await runCheck();
    } finally {
      setCheckingNow(false);
    }
  };

  const showSlowNotice = elapsed >= 90 && status !== "verified";

  const banner = (() => {
    if (status === "verified") {
      return {
        color: "border-emerald-300 bg-emerald-50 text-emerald-700",
        icon: <CheckCircle2 className="w-5 h-5" />,
        text: "Sua identidade foi verificada. Bem-vindo(a) à Monetisexy!",
      };
    }
    if (status === "requires_input") {
      return {
        color: "border-amber-300 bg-amber-50 text-amber-700",
        icon: <AlertTriangle className="w-5 h-5" />,
        text: "Precisamos de mais informações. Você pode reenviar seus documentos.",
      };
    }
    return {
      color: "border-red-300 bg-red-50 text-red-700",
      icon: <AlertTriangle className="w-5 h-5" />,
      text: "Verificação cancelada. Tente novamente quando quiser.",
    };
  })();

  const isProcessing = status === "processing" || status === "not_started";

  return (
    <OnboardingShell title="Verificação de documentos" step={3} backTo="/dashboard">
      <div className="mx-auto max-w-2xl text-center">
        {isProcessing ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center">
            <GooeyLoader className="h-28 w-56 text-[14px]" />
            <p className="mt-8 text-lg font-semibold text-neutral-900">
              Verificação de identidade em andamento
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">
              Isso pode demorar alguns minutos. Você será redirecionado
              automaticamente assim que for concluído.
            </p>

            {showSlowNotice && (
              <div className="mt-8 max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-800">
                <p className="font-semibold">Está demorando mais que o esperado.</p>
                <p className="mt-1 text-amber-700">
                  Se você já concluiu o processo na Veriff, clique em
                  "Verificar agora". Caso contrário, você pode voltar ao painel
                  — vamos te avisar assim que for aprovado.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleCheckNow}
                    disabled={checkingNow}
                    className="flex-1 px-4 py-2 rounded-md bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-400 text-white text-sm font-semibold shadow-glow hover:opacity-90 transition disabled:opacity-50"
                  >
                    {checkingNow ? "Verificando..." : "Verificar agora"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/dashboard" })}
                    className="flex-1 px-4 py-2 rounded-md border border-amber-300 bg-white text-sm font-medium text-amber-800 hover:bg-amber-100 transition"
                  >
                    Voltar ao painel
                  </button>
                </div>
              </div>
            )}
          </div>

        ) : (
          <>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-neutral-900">
              Tudo pronto! Agora só esperar enquanto cuidamos do resto.
            </h2>

            <div className="mt-8 mx-auto max-w-md rounded-3xl overflow-hidden border border-neutral-200 shadow-glow">
              <img
                src={mosaicImg}
                alt="Creators da Monetisexy"
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

            <p className="mt-6 text-sm text-neutral-600 max-w-lg mx-auto">
              Estamos validando os dados informados. Avisaremos nos próximos minutos
              o resultado — enquanto isso, aproveite para explorar a Monetisexy.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate({ to: "/dashboard" })}
                className="px-8 py-3 rounded-md bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-400 text-white font-semibold shadow-glow hover:opacity-90 transition"
              >
                Ir para o painel
              </button>
              {status === "requires_input" || status === "canceled" ? (
                <button
                  type="button"
                  onClick={() => navigate({ to: "/creator/onboarding/documentos" })}
                  className="px-8 py-3 rounded-md border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition"
                >
                  Tentar novamente
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </OnboardingShell>
  );
}
