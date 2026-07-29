import type { ReactNode } from "react";
import { createFileRoute, Link, useRouter, redirect } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeft,
  ChevronRight,
  DollarSign,
  EyeOff,
  Globe,
  Link2,
  MessageCircle,
  Contrast,
  Shield,
  User,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/settings/creator")({
  head: () => ({
    meta: [
      { title: "Configurações de Perfil · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw redirect({ to: "/entrar" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, account_type, avatar_url, active_profile_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: creatorProfiles } = await supabase
      .from("creator_profiles")
      .select("id, kind, username, display_name, avatar_url")
      .eq("user_id", user.id);
    const rows = (creatorProfiles ?? []) as Array<{
      id: string;
      kind: "paid" | "free";
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>;
    const activeCreator =
      rows.find((row) => row.id === profile?.active_profile_id) ??
      rows.find((row) => row.kind === "paid") ??
      rows[0] ??
      null;
    const username =
      activeCreator?.username ?? profile?.username ?? user.email?.split("@")[0] ?? "voce";
    const displayName =
      activeCreator?.display_name ??
      (activeCreator?.kind === "paid" ? profile?.display_name : null) ??
      username.charAt(0).toUpperCase() + username.slice(1).split(/[._-]/)[0];
    const accountType = (profile?.account_type ?? "subscriber") as
      | "subscriber"
      | "creator"
      | "free_creator";
    const activeKind = activeCreator?.kind ?? null;
    return {
      username,
      displayName,
      accountType,
      activeKind,
      avatarUrl: activeCreator
        ? activeCreator.avatar_url ?? (activeCreator.kind === "paid" ? profile?.avatar_url ?? null : null)
        : profile?.avatar_url ?? null,
    };
  },

  component: SettingsCreatorPage,
});

function SettingsCreatorPage() {
  const router = useRouter();
  const { username, displayName, accountType, activeKind, avatarUrl } = Route.useRouteContext();
  const isSubscriber = accountType === "subscriber";

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-card">
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
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
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
            {isSubscriber && (
              <p className="text-sm font-semibold text-orange-500 mt-0.5">
                Perfil Grátis
              </p>
            )}
            {!isSubscriber && activeKind === "free" && (
              <p className="text-sm font-semibold text-primary mt-0.5">
                Perfil gratuito vinculado
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        {isSubscriber ? (
          <>
            <SettingsGroup title="Geral">
              <SettingsRow
                icon={<EyeOff className="h-5 w-5" />}
                label="Privacidade"
                to="/settings/privacy"
              />
              <SettingsRow
                icon={<Link2 className="h-5 w-5" />}
                label="Link de indicação"
              />
              <SettingsRow
                icon={<MessageCircle className="h-5 w-5" />}
                label="Configuração do chat"
                to="/settings/chat-settings"
              />
              <SettingsRow
                icon={<UserX className="h-5 w-5" />}
                label="Assinantes restritos"
                to="/settings/restrictions"
              />
            </SettingsGroup>

            <div className="rounded-2xl bg-orange-50 border border-orange-100 px-5 py-4 text-center text-sm text-foreground">
              Outras personalizações do menu estão disponíveis apenas no perfil pago.
            </div>
          </>
        ) : (
          <>
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
                to="/settings/restrictions"
              />
              <SettingsRow
                icon={<Archive className="h-5 w-5" />}
                label="Postagens arquivadas"
                to="/postsarquivados"
              />
              <SettingsRow
                icon={<Contrast className="h-5 w-5" />}
                label="Tema"
                to="/settings/theme"
              />
              <SettingsRow
                icon={<Globe className="h-5 w-5" />}
                label="Idioma"
                to="/settings/language"
              />
            </SettingsGroup>
          </>
        )}
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
