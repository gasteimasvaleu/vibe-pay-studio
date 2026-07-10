import type { ReactNode } from "react";
import { createFileRoute, Link, useRouter, redirect } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  DollarSign,
  EyeOff,
  Globe,
  MessageCircle,
  Contrast,
  Shield,
  User,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/settings/creator")({
  head: () => ({
    meta: [
      { title: "Configurações de Perfil · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/entrar" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const username =
      profile?.username ?? userData.user.email?.split("@")[0] ?? "voce";
    return { username };
  },
  component: SettingsCreatorPage,
});

function SettingsCreatorPage() {
  const router = useRouter();
  const { username } = Route.useRouteContext();
  const displayName =
    username.charAt(0).toUpperCase() + username.slice(1).split(/[._-]/)[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border backdrop-blur-md bg-card/80">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Configurações de Perfil
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-8">
        <Link
          to="/settings/myprofile"
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-accent transition-colors"
        >
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {displayName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">
              {displayName}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              @{username}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <SettingsGroup title="Perfil">
          <SettingsRow
            icon={<DollarSign className="h-5 w-5" />}
            label="Assinatura"
            to="/settings/subscription"
          />
          <SettingsRow
            icon={<User className="h-5 w-5" />}
            label="Dados Pessoais"
            to="/settings/personal"
          />
        </SettingsGroup>

        <SettingsGroup title="Geral">
          <SettingsRow
            icon={<Shield className="h-5 w-5" />}
            label="Segurança"
            to="/settings/security-menu"
          />
          <SettingsRow
            icon={<EyeOff className="h-5 w-5" />}
            label="Privacidade"
            to="/settings/privacy"
          />
          <SettingsRow
            icon={<MessageCircle className="h-5 w-5" />}
            label="Configuração do chat"
            to="/settings/chat-settings"
          />
          <SettingsRow
            icon={<UserX className="h-5 w-5" />}
            label="Assinantes restritos"
          />
          <SettingsRow
            icon={<Contrast className="h-5 w-5" />}
            label="Tema"
          />
          <SettingsRow
            icon={<Globe className="h-5 w-5" />}
            label="Idioma"
          />
        </SettingsGroup>
      </main>
    </div>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-foreground px-1">{title}</h2>
      <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-card">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({
  icon,
  label,
  to,
}: {
  icon: ReactNode;
  label: string;
  to?: string;
}) {
  const content = (
    <>
      <span className="text-foreground">{icon}</span>
      <span className="flex-1 text-base text-foreground">{label}</span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </>
  );
  const className =
    "flex items-center gap-3 px-4 py-4 hover:bg-accent transition-colors w-full text-left";

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toast.info("Em breve")}
      className={className}
    >
      {content}
    </button>
  );
}
