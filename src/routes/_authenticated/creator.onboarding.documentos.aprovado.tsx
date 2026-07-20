import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Rocket, Users } from "lucide-react";
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

        <p className="mt-3 text-neutral-700 leading-relaxed max-w-lg mx-auto">
          Tudo certo por aqui. Sua conta está oficialmente pronta para monetizar
          — pagamentos, publicações e assinantes já podem ser gerenciados no seu
          painel.
        </p>

        <div className="mt-8 mx-auto max-w-md rounded-3xl overflow-hidden border border-neutral-200 shadow-glow">
          <img
            src={heroImg}
            alt=""
            width={1024}
            height={1024}
            loading="lazy"
            className="w-full h-auto"
          />
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3 text-left">
          <NextCard
            icon={<Sparkles className="w-4 h-4" />}
            title="Publique seu primeiro conteúdo"
            desc="Fotos, vídeos ou textos exclusivos."
          />
          <NextCard
            icon={<Users className="w-4 h-4" />}
            title="Convide sua audiência"
            desc="Compartilhe seu link nas redes."
          />
          <NextCard
            icon={<Rocket className="w-4 h-4" />}
            title="Acompanhe seus ganhos"
            desc="Métricas e pagamentos no painel."
          />
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="px-8 py-3.5 rounded-md bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-400 text-white font-semibold shadow-glow hover:opacity-90 transition"
          >
            Ir para o painel
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}

function NextCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-fuchsia-100 border border-fuchsia-200 text-fuchsia-600">
        {icon}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 text-xs text-neutral-600 leading-relaxed">{desc}</p>
    </div>
  );
}
