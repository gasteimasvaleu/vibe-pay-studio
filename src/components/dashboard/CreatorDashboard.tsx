import { useState } from "react";
import {
  Bookmark,
  DollarSign,
  HelpCircle,
  LogOut,
  MessageCircle,
  PenSquare,
  Settings,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ActionCard } from "./ActionCard";
import { DashboardGroup, DashboardShell } from "./DashboardShell";

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
        <DashboardGroup title="Meu negócio">
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
          <ActionCard
            icon={<Wallet className="h-5 w-5" />}
            title="Carteira"
            description="Métodos de pagamento e histórico"
          />
        </DashboardGroup>

        <DashboardGroup title="Comunicação">
          <ActionCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Chat"
            description="Converse com seus assinantes"
            to="/chat"
          />
        </DashboardGroup>

        <DashboardGroup title="Conta">
          <ActionCard
            icon={<User className="h-5 w-5" />}
            title="Perfil"
            description="Editar suas informações públicas"
          />
          <ActionCard
            icon={<Bookmark className="h-5 w-5" />}
            title="Atividades"
            description="Mídias favoritas e salvas"
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
        </DashboardGroup>
      </div>
    </DashboardShell>
  );
}
