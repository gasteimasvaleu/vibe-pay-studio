import { useState } from "react";
import {
  BadgeCheck,
  Bookmark,
  HelpCircle,
  LogOut,
  MessageCircle,
  Settings,
  User,
  UserPlus,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ActionCard } from "./ActionCard";
import { DashboardShell } from "./DashboardShell";

export function SubscriberDashboard({
  username,
  creatorNextStep,
  creatorOnboardingStarted,
}: {
  username: string;
  creatorNextStep: string;
  creatorOnboardingStarted: boolean;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <DashboardShell username={username} isCreator={false}>
      <section className="space-y-4">
        <h3 className="text-lg font-black tracking-tight text-white/90">
          Área do Assinante
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          />
          <ActionCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="Chat"
            description="Converse com creators e assinantes"
            to="/chat"
          />
          <ActionCard
            icon={<UserPlus className="h-5 w-5" />}
            title="Assinaturas"
            description="Veja os creators que você assina"
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
    </DashboardShell>
  );
}
