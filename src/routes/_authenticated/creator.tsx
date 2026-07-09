import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { homeForAccountType } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/creator")({
  head: () => ({
    meta: [
      { title: "Painel do Creator · Monetisex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/entrar" });
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "account_type, username, price_monthly, kyc_status, instagram_handle, tiktok_handle, x_handle, onboarding_completed_at",
      )
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!profile) {
      throw redirect({ to: "/entrar" });
    }

    const hasCreatorOnboardingStarted =
      !!profile.instagram_handle ||
      !!profile.tiktok_handle ||
      !!profile.x_handle ||
      profile.price_monthly != null ||
      profile.kyc_status !== "not_started";

    if (profile.account_type !== "creator" && !hasCreatorOnboardingStarted) {
      throw redirect({ to: homeForAccountType(profile.account_type) });
    }

    if (!profile.onboarding_completed_at) {
      const noSocials =
        !profile.instagram_handle && !profile.tiktok_handle && !profile.x_handle;
      const noPrice = profile.price_monthly == null;
      const kycPending =
        profile.kyc_status === "not_started" ||
        profile.kyc_status === "requires_input";
      const kycProcessing = profile.kyc_status === "processing";

      if (noSocials && noPrice && profile.kyc_status === "not_started") {
        throw redirect({ to: "/creator/onboarding/redes-sociais" });
      }
      if (noPrice) {
        throw redirect({ to: "/creator/onboarding/assinatura" });
      }
      if (kycPending) {
        throw redirect({ to: "/creator/onboarding/documentos" });
      }
      if (kycProcessing) {
        throw redirect({ to: "/creator/onboarding/documentos/verificando" });
      }
    }

    return { username: profile.username };
  },
  component: CreatorHome,
});

function CreatorHome() {
  const { username } = Route.useRouteContext();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {}, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-black tracking-tight">
            monet<span className="text-gradient-primary">isex</span>
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {signingOut ? "Saindo..." : "Sair"}
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12">
        <span className="inline-block text-xs label-caps rounded-full bg-primary/10 text-primary px-3 py-1">
          Área do Creator
        </span>
        <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">
          Olá, @{username}
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Este é o seu painel. Em breve você poderá publicar conteúdo, gerenciar
          assinantes e acompanhar seus pagamentos por aqui.
        </p>
      </main>
    </div>
  );
}
