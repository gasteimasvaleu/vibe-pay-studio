import { useState } from "react";
import {
  BadgePercent,
  Bookmark,
  Bug,
  Clock,

  FolderPlus,
  HelpCircle,
  Landmark,
  LineChart,
  LogOut,
  MessageCircle,
  Radio,
  Settings,
  ShieldAlert,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setActiveProfileView } from "@/lib/account.functions";
import { ActionCard } from "./ActionCard";
import { DashboardGroup, DashboardShell } from "./DashboardShell";
import { EarningsSummary } from "./EarningsSummary";

type Variant = "creator" | "free_creator" | "linked_free";

export function CreatorDashboard({
  username,
  variant = "creator",
  avatarUrl,
  switchAvatarUrl,
  freeProfileEnabled = false,
}: {
  username: string;
  variant?: Variant;
  avatarUrl?: string | null;
  switchAvatarUrl?: string | null;
  freeProfileEnabled?: boolean;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const switchView = useServerFn(setActiveProfileView);

  // Perfil gratuito (vinculado ou puro) não expõe cards de assinatura paga.
  const isFreeMode = variant === "free_creator" || variant === "linked_free";

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleSwitchToFree = async () => {
    if (!freeProfileEnabled) {
      navigate({ to: "/criar-perfil-gratuito" });
      return;
    }
    setSwitching(true);
    try {
      await switchView({ data: { view: "free" } });
      await queryClient.invalidateQueries();
      await router.invalidate();
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao trocar de perfil");
    } finally {
      setSwitching(false);
    }
  };

  const handleSwitchToCreator = async () => {
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

  let switchBar: React.ComponentProps<typeof DashboardShell>["switchBar"];
  if (variant === "creator") {
    switchBar = {
      label: freeProfileEnabled
        ? "Acessar perfil gratuito"
        : "Ativar perfil gratuito",
      onClick: handleSwitchToFree,
      loading: switching,
      avatarUrl: freeProfileEnabled ? switchAvatarUrl : null,
    };
  } else if (variant === "linked_free") {
    switchBar = {
      label: "Voltar ao perfil creator",
      onClick: handleSwitchToCreator,
      loading: switching,
      avatarUrl: switchAvatarUrl,
    };
  }

  return (
    <DashboardShell
      username={username}
      isCreator
      avatarUrl={avatarUrl}
      switchBar={switchBar}
    >

      <div className="space-y-6">
        <EarningsSummary />

        <DashboardGroup title="Área do Criador">
          <ActionCard
            icon={<User className="h-5 w-5" />}
            title="Meu Perfil"
            description="Acesse e visualize seu perfil"
            to={`/profile/${username}`}
          />
          {!isFreeMode && (
            <ActionCard
              icon={<BadgePercent className="h-5 w-5" />}
              title="Ofertas"
              description="Aqui você pode gerir suas Ofertas"
              to="/promotions"
            />
          )}
          {variant === "creator" && (
            <ActionCard
              icon={<UserPlus className="h-5 w-5" />}
              title="Perfil Gratuito"
              description="Seu perfil gratuito no ar em um clique."
              to="/criar-perfil-gratuito"
            />
          )}
          <ActionCard
            icon={<LineChart className="h-5 w-5" />}
            title="Meu Monetisexy"
            description="Veja suas vendas e engajamento"
            to="/my-monetisex-stats"
          />
          <ActionCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Chat"
            description="Converse com seus assinantes agora"
            to="/chat"
          />
          <ActionCard
            icon={<Landmark className="h-5 w-5" />}
            title="Meu Banco"
            description="Gerencie saques e saldo disponível"
            to="/banco"
          />
          <ActionCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Em Alta"
            description="Descubra o que está bombando"
            to="/em-alta"
          />
          {!isFreeMode && (
            <ActionCard
              icon={<Users className="h-5 w-5" />}
              title="Meus assinantes"
              description="Acompanhe quem mais te apoia"
              to="/follow"
            />
          )}
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
            icon={<FolderPlus className="h-5 w-5" />}
            title="Acervo"
            description="Gerencie seus conteúdos com praticidade"
            to="/vault"
          />
          <ActionCard
            icon={<Clock className="h-5 w-5" />}
            title="Agendados"
            description="Veja e edite suas publicações agendadas"
            to="/publicacoes-agendadas"
          />
          <ActionCard
            icon={<Radio className="h-5 w-5" />}
            title="Live (em breve)"
            description="Transmita ao vivo para assinantes"
            disabled
          />

          <ActionCard
            icon={<Bug className="h-5 w-5" />}
            title="Reportar bug"
            description="Teve um problema? Conte pra gente"
            to="/bugreport"
          />
          <ActionCard
            icon={<ShieldAlert className="h-5 w-5" />}
            title="Vazamento"
            description="Alguém usou seu conteúdo?"
            to="/content-leak-report"
          />
        </DashboardGroup>

        <DashboardGroup title="Outras Funcionalidades">
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
          />
          <ActionCard
            icon={<LogOut className="h-5 w-5" />}
            title={signingOut ? "Saindo..." : "Sair"}
            description="Sair da plataforma"
            tone="danger"
            onClick={handleSignOut}
            disabled={signingOut}
          />
        </DashboardGroup>
      </div>
    </DashboardShell>
  );
}
