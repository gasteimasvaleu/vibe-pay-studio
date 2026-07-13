import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/settings/social")({
  head: () => ({
    meta: [
      { title: "Nome de perfil e identificador · Monetisexy" },
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
  component: SettingsSocialPage,
});

function SettingsSocialPage() {
  const router = useRouter();
  const { username } = Route.useRouteContext();
  const initialDisplayName =
    username.charAt(0).toUpperCase() + username.slice(1).split(/[._-]/)[0];

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [handle, setHandle] = useState(username);

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-white">
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
            Nome de perfil e Identificador
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-3">
        <label className="block rounded-2xl bg-muted px-5 py-3">
          <span className="block text-xs text-muted-foreground">
            Nome do Perfil
          </span>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="border-0 bg-transparent p-0 h-auto text-lg text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-muted px-5 py-3">
          <MessageCircle className="h-6 w-6 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="block text-xs text-muted-foreground">
              monetisexy.com.br/(seu @)
            </span>
            <Input
              value={handle}
              onChange={(e) =>
                setHandle(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "")
                    .slice(0, 30),
                )
              }
              className="border-0 bg-transparent p-0 h-auto text-lg text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </label>
      </main>
    </div>
  );
}
