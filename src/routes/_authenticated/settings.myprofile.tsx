import type { ReactNode } from "react";
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import {
  ArrowLeft,
  AtSign,
  Camera,
  ChevronRight,
  Copy,
  Image as ImageIcon,
  Lock,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/myprofile")({
  head: () => ({
    meta: [
      { title: "Meu perfil · Monetisex" },
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
  component: SettingsMyProfilePage,
});

function SettingsMyProfilePage() {
  const router = useRouter();
  const { username } = Route.useRouteContext();
  const displayName =
    username.charAt(0).toUpperCase() + username.slice(1).split(/[._-]/)[0];

  const handleCopyLink = async () => {
    try {
      const link = `${window.location.origin}/perfil/${username}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

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
            Meu perfil
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <section className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="h-28 w-28 ring-4 ring-card shadow-card">
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-semibold">
                {displayName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => toast.info("Em breve")}
              aria-label="Alterar foto"
              className="absolute bottom-1 right-1 h-9 w-9 grid place-items-center rounded-full bg-foreground text-background shadow-md hover:opacity-90 transition-opacity"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{displayName}</p>
            <p className="text-sm text-muted-foreground">@{username}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyLink}
            className="mt-2 h-11 px-6 rounded-full gap-2"
          >
            <Copy className="h-4 w-4" />
            Copiar meu link Privacy
          </Button>
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-card">
          <SettingsRow
            icon={<User className="h-5 w-5" />}
            label="Nome de perfil e identificador"
          />
          <SettingsRow
            icon={<ImageIcon className="h-5 w-5" />}
            label="Foto de capa, biografia e localização"
          />
          <SettingsRow
            icon={<AtSign className="h-5 w-5" />}
            label="Redes Sociais"
          />
          <SettingsRow
            icon={<Lock className="h-5 w-5" />}
            label="Alterar senha"
          />
          <SettingsRow
            icon={<Trash2 className="h-5 w-5" />}
            label="Excluir conta"
            variant="destructive"
          />
        </section>
      </main>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  variant,
}: {
  icon: ReactNode;
  label: string;
  variant?: "destructive";
}) {
  const isDestructive = variant === "destructive";
  return (
    <button
      type="button"
      onClick={() => toast.info("Em breve")}
      className="flex items-center gap-3 px-4 py-4 hover:bg-accent transition-colors w-full text-left"
    >
      <span className={isDestructive ? "text-destructive" : "text-foreground"}>
        {icon}
      </span>
      <span
        className={`flex-1 text-base ${
          isDestructive ? "text-destructive font-medium" : "text-foreground"
        }`}
      >
        {label}
      </span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}
