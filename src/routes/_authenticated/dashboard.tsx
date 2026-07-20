import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CreatorDashboard } from "@/components/dashboard/CreatorDashboard";
import { SubscriberDashboard } from "@/components/dashboard/SubscriberDashboard";
import { isCreatorLike, type AccountType } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu painel · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw redirect({ to: "/entrar" });

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "account_type, username, avatar_url, price_monthly, kyc_status, instagram_handle, tiktok_handle, x_handle, onboarding_completed_at, free_profile_enabled, active_view, free_display_name, free_avatar_url",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const accountType = (profile?.account_type ?? "subscriber") as AccountType;
    const username =
      profile?.username ?? user.email?.split("@")[0] ?? "voce";
    const freeProfileEnabled = profile?.free_profile_enabled === true;
    const activeView = (profile?.active_view ?? "creator") as "creator" | "free";
    // Modo de exibição efetivo: creator pago em modo "free" renderiza a UI de assinante.
    const inFreeMode =
      accountType === "creator" && freeProfileEnabled && activeView === "free";
    const avatarUrl = inFreeMode
      ? profile?.free_avatar_url ?? profile?.avatar_url ?? null
      : profile?.avatar_url ?? null;

    // Creator pago meio-cadastrado: manda pro próximo passo do onboarding.
    // (free_creator não passa por esse fluxo — ele finaliza em /criar-perfil-gratuito.)
    if (accountType === "creator" && !profile?.onboarding_completed_at) {
      const hasPrice = profile?.price_monthly != null;
      const kyc = profile?.kyc_status ?? "not_started";
      if (kyc === "processing") {
        throw redirect({ to: "/creator/onboarding/documentos/verificando" });
      }
      if (kyc === "requires_input" || (hasPrice && kyc === "not_started")) {
        throw redirect({ to: "/creator/onboarding/documentos" });
      }
      if (!hasPrice) {
        throw redirect({ to: "/creator/onboarding/assinatura" });
      }
    }

    // Próximo passo do onboarding para assinantes puros que já iniciaram.
    const hasSocials =
      !!profile?.instagram_handle ||
      !!profile?.tiktok_handle ||
      !!profile?.x_handle;
    const hasPrice = profile?.price_monthly != null;
    const kyc = profile?.kyc_status ?? "not_started";
    let creatorNextStep: string = "/creator/onboarding/redes-sociais";
    if (kyc === "processing") {
      creatorNextStep = "/creator/onboarding/documentos/verificando";
    } else if (kyc === "requires_input") {
      creatorNextStep = "/creator/onboarding/documentos";
    } else if (!hasSocials && !hasPrice) {
      creatorNextStep = "/creator/onboarding/redes-sociais";
    } else if (!hasPrice) {
      creatorNextStep = "/creator/onboarding/assinatura";
    } else if (kyc === "not_started") {
      creatorNextStep = "/creator/onboarding/documentos";
    }
    const creatorOnboardingStarted =
      hasSocials || hasPrice || kyc !== "not_started";

    return {
      username,
      avatarUrl,
      accountType,
      creatorNextStep,
      creatorOnboardingStarted,
      freeProfileEnabled,
      activeView,
      inFreeMode,
    };
  },
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-white grid place-items-center p-6">
      <p className="text-sm text-white/70">
        Não foi possível carregar seu painel: {error.message}
      </p>
    </div>
  ),
});

function DashboardPage() {
  const {
    username,
    avatarUrl,
    accountType,
    creatorNextStep,
    creatorOnboardingStarted,
    freeProfileEnabled,
    inFreeMode,
  } = Route.useRouteContext();

  // Creator pago no modo gratuito → renderiza a UI de assinante com botão
  // "Voltar ao perfil creator".
  if (accountType === "creator" && inFreeMode) {
    return (
      <SubscriberDashboard
        username={username}
        avatarUrl={avatarUrl}
        creatorNextStep={creatorNextStep}
        creatorOnboardingStarted={creatorOnboardingStarted}
        linkedCreatorMode
      />
    );
  }

  if (isCreatorLike(accountType)) {
    return (
      <CreatorDashboard
        username={username}
        avatarUrl={avatarUrl}
        variant={accountType === "free_creator" ? "free_creator" : "creator"}
        freeProfileEnabled={freeProfileEnabled}
      />
    );
  }

  return (
    <SubscriberDashboard
      username={username}
      avatarUrl={avatarUrl}
      creatorNextStep={creatorNextStep}
      creatorOnboardingStarted={creatorOnboardingStarted}
    />
  );
}
