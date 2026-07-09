import { useState } from "react";
import {
  BadgePercent,
  Bookmark,
  Bug,
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
import { supabase } from "@/integrations/supabase/client";
import { ActionCard } from "./ActionCard";
import { DashboardGroup, DashboardShell } from "./DashboardShell";
import { EarningsSummary } from "./EarningsSummary";

export function CreatorDashboard({ username }: { username: string }) {
  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <DashboardShell username={username} isCreator>
      <div className="space-y-6">
        <EarningsSummary />

        <DashboardGroup title="Área do Criador">
          <ActionCard
            icon={<User className="h-5 w-5" />}
            title="Meu Perfil"
            description="Acesse e visualize seu perfil"
          />
          <ActionCard
            icon={<BadgePercent className="h-5 w-5" />}
            title="Ofertas"
            description="Aqui você pode gerir suas Ofertas"
            to="/promotions"
          />
          <ActionCard
            icon={<UserPlus className="h-5 w-5" />}
            title="Perfil Gratuito"
            description="Seu perfil gratuito no ar em um clique."
          />
          <ActionCard
            icon={<LineChart className="h-5 w-5" />}
            title="Meu Monetisex"
            description="Veja suas vendas e engajamento"
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
          />
          <ActionCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Em Alta"
            description="Descubra o que está bombando"
          />
          <ActionCard
            icon={<Users className="h-5 w-5" />}
            title="Meus assinantes"
            description="Acompanhe quem mais te apoia"
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
            icon={<FolderPlus className="h-5 w-5" />}
            title="Acervo"
            description="Gerencie seus conteúdos com praticidade"
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
          />
          <ActionCard
            icon={<ShieldAlert className="h-5 w-5" />}
            title="Vazamento"
            description="Alguém usou seu conteúdo?"
          />
        </DashboardGroup>

        <DashboardGroup title="Outras Funcionalidades">
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
        </DashboardGroup>
      </div>
    </DashboardShell>
  );
}
