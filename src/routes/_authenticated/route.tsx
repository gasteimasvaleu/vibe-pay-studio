import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GooeyLoader } from "@/components/onboarding/GooeyLoader";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

function AuthenticatedLayout() {
  return <Outlet />;
}

function VerificationLoadingState() {
  return (
    <OnboardingShell title="Verificação de documentos" step={3} backTo="/dashboard">
      <div className="mx-auto max-w-2xl text-center">
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <GooeyLoader className="h-28 w-56 text-[14px]" />
          <p className="mt-8 text-lg font-semibold text-white/90">
            Verificação de identidade em andamento
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60">
            Isso pode demorar alguns minutos. Você será redirecionado
            automaticamente assim que for concluído.
          </p>
        </div>
      </div>
    </OnboardingShell>
  );
}

function AuthenticatedPending() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname === "/creator/onboarding/documentos/verificando") {
    return <VerificationLoadingState />;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background text-foreground">
      <GooeyLoader className="h-24 w-48 text-[12px]" />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/entrar" });
    }
    return { user: data.user };
  },
  pendingComponent: AuthenticatedPending,
  component: AuthenticatedLayout,
});
