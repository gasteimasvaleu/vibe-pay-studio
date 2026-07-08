import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { homeForAccountType } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Seu feed · Monetisex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/entrar" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, username")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (profile?.account_type === "creator") {
      throw redirect({ to: homeForAccountType(profile.account_type) });
    }
    return { username: profile?.username ?? "" };
  },
  component: FeedHome,
});

function FeedHome() {
  const { username } = Route.useRouteContext();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-black tracking-tight">
            monet<span className="text-gradient-primary">isex</span>
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {signingOut ? "Saindo..." : "Sair"}
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12">
        <span className="inline-block text-xs label-caps rounded-full bg-primary/10 text-primary px-3 py-1">
          Área do Assinante
        </span>
        <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">
          Olá, @{username}
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Este é o seu feed. Em breve você poderá seguir seus criadores favoritos
          e acessar conteúdos exclusivos por aqui.
        </p>
      </main>
    </div>
  );
}
