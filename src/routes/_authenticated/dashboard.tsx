import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CreatorDashboard } from "@/components/dashboard/CreatorDashboard";
import { SubscriberDashboard } from "@/components/dashboard/SubscriberDashboard";
import { isCreatorLike, type AccountType } from "@/lib/auth";
import { creatorOnboardingStepFrom } from "@/lib/onboarding-step";

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

    const [{ data: profile }, { data: cps }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "account_type, username, avatar_url, price_monthly, kyc_status, instagram_handle, tiktok_handle, x_handle, onboarding_completed_at, free_profile_enabled, active_view, active_profile_id, free_display_name, free_avatar_url, free_username",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("creator_profiles")
        .select("id, kind, username, display_name, avatar_url, price_monthly")
        .eq("user_id", user.id),
    ]);

    const accountType = (profile?.account_type ?? "subscriber") as AccountType;
    const creatorProfiles = ((cps ?? []) as Array<{ id: string; kind: string; username: string; display_name: string | null; avatar_url: string | null; price_monthly: number | null }>);
    const paid = creatorProfiles.find((r) => r.kind === "paid") ?? null;
    const free = creatorProfiles.find((r) => r.kind === "free") ?? null;
    const active =
      creatorProfiles.find((r) => r.id === profile?.active_profile_id) ??
      paid ??
      free ??
      null;

    // Identity resolved from creator_profiles first, com fallback nos campos legados.
    const username =
      active?.username ??
      profile?.username ??
      user.email?.split("@")[0] ??
      "voce";
    const freeProfileEnabled = profile?.free_profile_enabled === true || !!free;
    const activeView = (active?.kind ?? profile?.active_view ?? "creator") === "free" ? "free" : "creator";
    const inFreeMode =
      accountType === "creator" && freeProfileEnabled && activeView === "free";
    const creatorAvatarUrl = paid?.avatar_url ?? profile?.avatar_url ?? null;
    const freeAvatarUrl = free?.avatar_url ?? profile?.free_avatar_url ?? profile?.avatar_url ?? null;
    const avatarUrl = active?.avatar_url ?? (inFreeMode ? freeAvatarUrl : creatorAvatarUrl);

    const hasSocials =
      !!profile?.instagram_handle ||
      !!profile?.tiktok_handle ||
      !!profile?.x_handle;
    const hasPrice = (paid?.price_monthly ?? profile?.price_monthly) != null;
    const kyc = profile?.kyc_status ?? "not_started";

    // Creator pago meio-cadastrado: manda pro próximo passo do onboarding.
    const pendingStep = creatorOnboardingStepFrom({
      accountType,
      onboardingCompletedAt: profile?.onboarding_completed_at,
      hasPrice,
      hasSocials,
      kycStatus: kyc,
    });
    if (pendingStep) {
      throw redirect({ to: pendingStep });
    }

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
      creatorAvatarUrl,
      freeAvatarUrl,
      accountType,
      creatorNextStep,
      creatorOnboardingStarted,
      freeProfileEnabled,
      activeView,
      inFreeMode,
      activeProfileKind: (active?.kind ?? "paid") as "paid" | "free",
    };
  },
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-white grid place-items-center p-6">
      <p className="text-sm text-white/70">
        Não foi possível carregar seu painel: {(error as Error).message}
      </p>
    </div>
  ),
});

function DashboardPage() {
  const {
    username,
    avatarUrl,
    creatorAvatarUrl,
    freeAvatarUrl,
    accountType,
    creatorNextStep,
    creatorOnboardingStarted,
    freeProfileEnabled,
    inFreeMode,
  } = Route.useRouteContext();

  // Creator pago no modo gratuito → renderiza o dashboard de criador com a
  // switch bar "Voltar ao perfil creator" e sem os cards de assinatura paga.
  if (accountType === "creator" && inFreeMode) {
    return (
      <CreatorDashboard
        username={username}
        avatarUrl={avatarUrl}
        switchAvatarUrl={creatorAvatarUrl}
        variant="linked_free"
        freeProfileEnabled={freeProfileEnabled}
      />
    );
  }

  if (isCreatorLike(accountType)) {
    return (
      <CreatorDashboard
        username={username}
        avatarUrl={avatarUrl}
        switchAvatarUrl={freeAvatarUrl}
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
