import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { GooeyLoader } from "@/components/onboarding/GooeyLoader";
import { completeOnboarding } from "@/lib/onboarding.functions";

const heroImg =
  "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/openart-021784545806860aaaf13501739a5ff290af8d9343e27fc9037e4_0_1784545870764_ebce0aa8.png";

export const Route = createFileRoute(
  "/_authenticated/creator/onboarding/documentos/aprovado",
)({
  head: () => ({
    meta: [
      { title: "Identidade aprovada · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AprovadoPage,
  pendingComponent: AprovadoPending,
});

function AprovadoPending() {
  return (
    <OnboardingShell title="Identidade aprovada" step={3} backTo="/dashboard">
      <div className="mx-auto max-w-2xl text-center">
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <GooeyLoader className="h-28 w-56 text-[14px]" />
          <p className="mt-8 text-lg font-semibold text-neutral-900">
            Finalizando sua verificação...
          </p>
        </div>
      </div>
    </OnboardingShell>
  );
}

function AprovadoPage() {
  const navigate = useNavigate();
  const finish = useServerFn(completeOnboarding);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    // Idempotente — servidor apenas atualiza o timestamp se ainda não estiver setado.
    finish().catch(() => {
      // ignora — usuário ainda pode seguir; próximo carregamento resolve.
    });
  }, [finish]);

  return (
    <OnboardingShell title="Identidade aprovada" step={3} backTo="/dashboard">
      <div className="max-w-2xl mx-auto text-center">

        <div className="mx-auto max-w-md rounded-3xl overflow-hidden border border-neutral-200 shadow-glow">
          <img
            src={heroImg}
            alt=""
            width={1024}
            height={1024}
            loading="lazy"
            className="w-full h-auto"
          />
        </div>

        <p className="mt-6 text-neutral-700 leading-relaxed max-w-lg mx-auto">
          Tudo certo por aqui. Sua conta está oficialmente pronta para monetizar
          — pagamentos, publicações e assinantes já podem ser gerenciados no seu
          painel.
        </p>

        <div className="mt-10 mx-auto max-w-md">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="w-full px-8 py-3.5 rounded-md bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition"
          >
            Ir para o painel
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
