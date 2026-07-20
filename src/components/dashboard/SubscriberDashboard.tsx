import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  HelpCircle,
  LogOut,
  MessageCircle,
  Settings,
  UserPlus,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setActiveProfileView } from "@/lib/account.functions";
import { ActionCard } from "./ActionCard";
import { DashboardShell } from "./DashboardShell";

export function SubscriberDashboard({
  username,
  creatorNextStep,
  creatorOnboardingStarted,
  avatarUrl,
  linkedCreatorMode = false,
}: {
  username: string;
  creatorNextStep: string;
  creatorOnboardingStarted: boolean;
  avatarUrl?: string | null;
  linkedCreatorMode?: boolean;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const switchView = useServerFn(setActiveProfileView);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleBackToCreator = async () => {
    setSwitching(true);
    try {
      await switchView({ data: { view: "creator" } });
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao trocar de perfil");
    } finally {
      setSwitching(false);
    }
  };

  const creatorTitle = creatorOnboardingStarted
    ? "Continuar cadastro de creator"
    : "Virar creator";
  const creatorDesc = creatorOnboardingStarted
    ? "Retome o onboarding de onde parou"
    : "Monetize seu conteúdo e receba assinantes";

  return (
    <DashboardShell
      username={username}
      isCreator={false}
      showProfileLink={false}
      avatarUrl={avatarUrl}
      switchBar={
        linkedCreatorMode
          ? {
              label: "Voltar ao perfil creator",
              onClick: handleBackToCreator,
              loading: switching,
            }
          : undefined
      }
    >

      <section className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight text-white/90">
          Área do Assinante
        </h3>

        {!linkedCreatorMode && (
          <button
            type="button"
            onClick={() => navigate({ to: creatorNextStep as never })}
            className="group w-full text-left rounded-2xl p-5 shadow-card bg-gradient-primary text-primary-foreground transition-all hover:brightness-110 flex items-center gap-4"
          >
            <div className="h-12 w-12 rounded-xl bg-white/20 border border-white/30 grid place-items-center shrink-0">
              <BadgeCheck className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base md:text-lg font-bold">{creatorTitle}</p>
              <p className="text-sm text-primary-foreground/80 mt-0.5">
                {creatorDesc}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
          </button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Chat"
            description="Converse com creators agora"
            to="/chat"
          />
          <ActionCard
            icon={<UserPlus className="h-5 w-5" />}
            title="Assinaturas"
            description="Veja os creators que você assina"
            to="/subscriptions"
          />
          <ActionCard
            icon={<Wallet className="h-5 w-5" />}
            title="Carteira"
            description="Escolha como paga e veja seus gastos"
            to="/mywallet"
          />
          <ActionCard
            icon={<Bookmark className="h-5 w-5" />}
            title="Atividades"
            description="Acesse suas mídias favoritas salvas"
            to="/colecoes"
          />
          <ActionCard
            icon={<Settings className="h-5 w-5" />}
            title="Definições"
            description="Personalize sua experiência"
            to="/settings/creator"
          />
          <ActionCard
            icon={<HelpCircle className="h-5 w-5" />}
            title="Ajuda"
            description="Precisa de suporte ou tem dúvidas?"
            to="/bugreport"
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
    </DashboardShell>
  );
}
