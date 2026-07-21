import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

export const Route = createFileRoute(
  "/_authenticated/creator/onboarding/documentos/veriff-concluido",
)({
  head: () => ({
    meta: [
      { title: "Verificação enviada · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VeriffConcluidoPage,
});

function VeriffConcluidoPage() {
  const navigate = useNavigate();

  return (
    <OnboardingShell title="Verificação enviada" step={3} backTo="/dashboard">
      <div className="mx-auto max-w-2xl text-center">
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <h2 className="mt-8 text-2xl md:text-3xl font-black tracking-tight leading-tight text-neutral-900">
            Verificação enviada com sucesso
          </h2>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-600">
            Recebemos seus documentos e estamos analisando. Você pode fechar
            esta janela — vamos te avisar no app assim que estiver tudo pronto.
          </p>

          <div className="mt-10 w-full max-w-sm flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                window.close();
              }}
              className="w-full px-8 py-3 rounded-md bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-400 text-white font-semibold shadow-glow hover:opacity-90 transition"
            >
              Fechar esta janela
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="w-full px-8 py-3 rounded-md border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition"
            >
              Voltar ao painel
            </button>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
