import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Film,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Instagram,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  MoreVertical,
  Music2,
  Settings,
  Twitter,
  UserPlus,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { homeForAccountType } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/assinante")({
  head: () => ({
    meta: [
      { title: "Área do Assinante · Monetisex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/entrar" });

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "account_type, username, price_monthly, kyc_status, instagram_handle, tiktok_handle, x_handle",
      )
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profile?.account_type === "creator") {
      throw redirect({ to: homeForAccountType("creator") });
    }

    const hasSocials =
      !!profile?.instagram_handle || !!profile?.tiktok_handle || !!profile?.x_handle;
    const hasPrice = profile?.price_monthly != null;
    const kycStatus = profile?.kyc_status ?? "not_started";

    let creatorNextStep: string | null = "/creator/onboarding/redes-sociais";
    if (kycStatus === "processing") {
      creatorNextStep = "/creator/onboarding/documentos/verificando";
    } else if (kycStatus === "requires_input") {
      creatorNextStep = "/creator/onboarding/documentos";
    } else if (!hasSocials && !hasPrice) {
      creatorNextStep = "/creator/onboarding/redes-sociais";
    } else if (!hasPrice) {
      creatorNextStep = "/creator/onboarding/assinatura";
    } else if (kycStatus === "not_started") {
      creatorNextStep = "/creator/onboarding/documentos";
    }

    const creatorOnboardingStarted = hasSocials || hasPrice || kycStatus !== "not_started";

    return {
      userId: userData.user.id,
      username: profile?.username ?? userData.user.email?.split("@")[0] ?? "voce",
      creatorNextStep,
      creatorOnboardingStarted,
    };
  },
  component: AssinantePage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-white grid place-items-center p-6">
      <p className="text-sm text-white/70">Não foi possível carregar sua área: {error.message}</p>
    </div>
  ),
});

function AssinantePage() {
  const { username } = Route.useRouteContext();
  const router = useRouter();

  const stats = { fotos: 12, videos: 3, locked: 0, likes: 84 };
  const displayName = username
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
  const location = "Brasil";

  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 opacity-70" style={{ background: "var(--gradient-radial)" }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

      {/* Topbar */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-black/20">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-white/80 hover:bg-white/10 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold truncate">{displayName}</h1>
          <button
            className="h-9 w-9 grid place-items-center rounded-full text-white/80 hover:bg-white/10 transition-colors"
            aria-label="Mais opções"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-8">
        {/* Cover + avatar + stats */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="relative h-44 md:h-56 rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
          </div>

          <div className="absolute left-4 md:left-6 -bottom-10">
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full border-4 border-background bg-gradient-to-br from-fuchsia-500 to-purple-700 grid place-items-center text-3xl font-black shadow-xl shadow-purple-900/40">
              {username.slice(0, 1).toUpperCase()}
            </div>
          </div>

          <div className="absolute right-4 md:right-6 bottom-4 hidden sm:flex items-center gap-4 rounded-full bg-black/40 backdrop-blur-md border border-white/15 px-4 py-2 text-xs">
            <Stat icon={<ImageIcon className="h-4 w-4" />} value={stats.fotos} />
            <Stat icon={<Film className="h-4 w-4" />} value={stats.videos} />
            <Stat icon={<Lock className="h-4 w-4" />} value={stats.locked} />
            <Stat icon={<Heart className="h-4 w-4" />} value={stats.likes} />
          </div>
        </motion.section>

        {/* Identity */}
        <div className="pt-10 sm:pt-12 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight">{displayName}</h2>
            <BadgeCheck className="h-6 w-6 text-fuchsia-400 fill-fuchsia-400/20" />
          </div>
          <p className="text-sm text-white/60">@{username}</p>

          <div className="sm:hidden flex items-center gap-4 text-xs text-white/70">
            <Stat icon={<ImageIcon className="h-4 w-4" />} value={stats.fotos} />
            <Stat icon={<Film className="h-4 w-4" />} value={stats.videos} />
            <Stat icon={<Lock className="h-4 w-4" />} value={stats.locked} />
            <Stat icon={<Heart className="h-4 w-4" />} value={stats.likes} />
          </div>

          <div className="flex items-center gap-2 text-sm text-white/70">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <SocialButton label="Instagram"><Instagram className="h-4 w-4" /></SocialButton>
            <SocialButton label="X"><Twitter className="h-4 w-4" /></SocialButton>
            <SocialButton label="TikTok"><Music2 className="h-4 w-4" /></SocialButton>
          </div>

          <div className="pt-2">
            <Link
              to="/perfil/$username"
              params={{ username }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-200 transition-colors"
            >
              Ver meu perfil público →
            </Link>
          </div>
        </div>

        {/* Área do Assinante */}
        <section className="space-y-5">
          <h3 className="text-2xl font-black tracking-tight">Área do Assinante</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionCard
              icon={<MessageCircle className="h-5 w-5" />}
              title="Chat"
              description="Converse com creators agora"
            />
            <ActionCard
              icon={<UserPlus className="h-5 w-5" />}
              title="Assinaturas"
              description="Veja os creators que você assina"
            />
            <ActionCard
              icon={<Wallet className="h-5 w-5" />}
              title="Carteira"
              description="Escolha como paga e veja seus gastos"
            />
            <ActionCard
              icon={<Bookmark className="h-5 w-5" />}
              title="Atividades"
              description="Acesse suas mídias favoritas salvas"
            />
            <ActionCard
              icon={<Settings className="h-5 w-5" />}
              title="Definições"
              description="Personalize sua experiência"
            />
            <ActionCard
              icon={<HelpCircle className="h-5 w-5" />}
              title="Ajuda"
              description="Precisa de suporte ou tem dúvidas?"
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

function Stat({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-white/80">
      <span className="text-white/60">{icon}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function SocialButton({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="h-9 w-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}

function ActionCard({
  icon,
  title,
  description,
  tone = "default",
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone?: "default" | "danger";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const isDanger = tone === "danger";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group text-left rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 transition-all hover:border-white/25 hover:bg-white/10 disabled:opacity-60 ${
        isDanger ? "hover:border-fuchsia-400/40" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl border grid place-items-center ${
            isDanger
              ? "bg-fuchsia-500/15 border-fuchsia-400/30 text-fuchsia-300"
              : "bg-white/5 border-white/10 text-fuchsia-300"
          }`}
        >
          {icon}
        </div>
        <span className={`text-base font-semibold ${isDanger ? "text-fuchsia-300" : "text-white"}`}>
          {title}
        </span>
      </div>
      <p className="mt-3 text-sm text-white/60">{description}</p>
    </button>
  );
}
