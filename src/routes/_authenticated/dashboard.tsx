import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  DollarSign,
  HelpCircle,
  LogOut,
  MessageCircle,
  PenSquare,
  Settings,
  User,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AccountType = "subscriber" | "creator";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu painel · Monetisex" },
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

    const accountType = (profile?.account_type ?? "subscriber") as AccountType;
    const username =
      profile?.username ?? userData.user.email?.split("@")[0] ?? "voce";

    // Creator meio-cadastrado: manda pro próximo passo do onboarding.
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

    // Próximo passo do onboarding para assinantes que já iniciaram.
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
      accountType,
      creatorNextStep,
      creatorOnboardingStarted,
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
  const { username, accountType, creatorNextStep, creatorOnboardingStarted } =
    Route.useRouteContext();
  const router = useRouter();

  const displayName = username
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isCreator = accountType === "creator";

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-black/20">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-white/80 hover:bg-white/10 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold truncate">Meu painel</h1>
          <Link
            to="/feed"
            className="text-xs text-white/60 hover:text-white transition-colors px-3"
          >
            Feed
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 grid place-items-center text-2xl font-black shadow-xl shadow-purple-900/40">
            {username.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight truncate">
                {displayName}
              </h2>
              {isCreator && (
                <BadgeCheck className="h-5 w-5 text-fuchsia-400 fill-fuchsia-400/20" />
              )}
            </div>
            <p className="text-sm text-white/60">@{username}</p>
            <Link
              to="/perfil/$username"
              params={{ username }}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-200 transition-colors"
            >
              Ver perfil público →
            </Link>
          </div>
        </motion.section>

        <section className="space-y-4">
          <h3 className="text-lg font-black tracking-tight text-white/90">
            {isCreator ? "Área do Creator" : "Área do Assinante"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isCreator ? (
              <>
                <ActionCard
                  icon={<PenSquare className="h-5 w-5" />}
                  title="Publicar"
                  description="Crie um novo post para seus assinantes"
                />
                <ActionCard
                  icon={<Users className="h-5 w-5" />}
                  title="Assinantes"
                  description="Veja quem assina seu conteúdo"
                />
                <ActionCard
                  icon={<DollarSign className="h-5 w-5" />}
                  title="Ganhos"
                  description="Acompanhe seus recebíveis e saques"
                />
              </>
            ) : (
              <ActionCard
                icon={<BadgeCheck className="h-5 w-5" />}
                title={
                  creatorOnboardingStarted
                    ? "Continuar cadastro de creator"
                    : "Virar creator"
                }
                description={
                  creatorOnboardingStarted
                    ? "Retome o onboarding de onde parou"
                    : "Monetize seu conteúdo e receba assinantes"
                }
                to={creatorNextStep}
                highlight
              />
            )}

            <ActionCard
              icon={<MessageCircle className="h-5 w-5" />}
              title="Chat"
              description="Converse com creators e assinantes"
            />
            <ActionCard
              icon={<UserPlus className="h-5 w-5" />}
              title="Assinaturas"
              description={
                isCreator
                  ? "Creators que você segue"
                  : "Veja os creators que você assina"
              }
            />
            <ActionCard
              icon={<Wallet className="h-5 w-5" />}
              title="Carteira"
              description="Métodos de pagamento e histórico"
            />
            <ActionCard
              icon={<Bookmark className="h-5 w-5" />}
              title="Atividades"
              description="Mídias favoritas e salvas"
            />
            <ActionCard
              icon={<User className="h-5 w-5" />}
              title="Perfil"
              description="Editar suas informações públicas"
            />
            <ActionCard
              icon={<Settings className="h-5 w-5" />}
              title="Definições"
              description="Personalize sua experiência"
            />
            <ActionCard
              icon={<HelpCircle className="h-5 w-5" />}
              title="Ajuda"
              description="Suporte e perguntas frequentes"
            />
            <ActionCard
              icon={<LogOut className="h-5 w-5" />}
              title={signingOut ? "Saindo..." : "Sair"}
              description="Sair da plataforma"
              tone="danger"
              onClick={handleSignOut}
              disabled={signingOut}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  tone = "default",
  onClick,
  disabled,
  to,
  highlight,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: "default" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  to?: string;
  highlight?: boolean;
}) {
  const isDanger = tone === "danger";
  const className = `group text-left rounded-2xl border p-5 backdrop-blur-md transition-all disabled:opacity-60 ${
    highlight
      ? "border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/15 to-purple-600/10 hover:border-fuchsia-300/70"
      : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
  } ${isDanger ? "hover:border-fuchsia-400/40" : ""}`;

  const content = (
    <>
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl border grid place-items-center ${
            isDanger
              ? "bg-fuchsia-500/15 border-fuchsia-400/30 text-fuchsia-300"
              : highlight
                ? "bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-200"
                : "bg-white/5 border-white/10 text-fuchsia-300"
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-base font-semibold ${
            isDanger ? "text-fuchsia-300" : "text-white"
          }`}
        >
          {title}
        </span>
      </div>
      <p className="mt-3 text-sm text-white/60">{description}</p>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}
