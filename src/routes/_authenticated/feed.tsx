import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, MessageCircle, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
    return {
      username: profile?.username ?? userData.user.email?.split("@")[0] ?? "voce",
      accountType: profile?.account_type ?? "subscriber",
    };
  },
  component: FeedPage,
});

function FeedPage() {
  const { username } = Route.useRouteContext();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-[#0b0518]">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

      {/* Top bar */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-black/30">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <Link to="/feed" className="text-lg font-black tracking-tight">
            monet<span className="text-gradient-primary">isex</span>
          </Link>
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <label className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
              <input
                type="search"
                placeholder="Buscar creators, tags, posts..."
                className="w-full h-10 pl-10 pr-4 rounded-full bg-white/10 border border-white/15 text-sm text-white placeholder:text-white/55 outline-none focus:border-white/40 focus:bg-white/15 transition-colors"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <IconButton aria-label="Notificações"><Bell className="h-5 w-5" /></IconButton>
            <IconButton aria-label="Mensagens"><MessageCircle className="h-5 w-5" /></IconButton>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="hidden sm:inline text-xs text-white/75 hover:text-white transition-colors px-3"
            >
              {signingOut ? "Saindo..." : "Sair"}
            </button>
            <Link
              to="/dashboard"
              aria-label="Meu painel"
              className="h-9 w-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center font-bold text-sm shadow-lg shadow-purple-500/40 hover:opacity-90 transition-opacity"
            >
              {username.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">

          {/* Welcome */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a0b2e]/90 via-[#2a1250]/90 to-[#1a0b2e]/90 backdrop-blur-xl p-6 md:p-8"
          >
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-fuchsia-500/30 blur-3xl" />
            <p className="text-xs uppercase tracking-widest text-white/70">Feed</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight">
              Olá, @{username} 👋
            </h1>
            <p className="mt-2 text-sm text-white/80 max-w-md">
              Aqui você acompanha o que os creators que você segue estão postando em tempo real.
            </p>
          </motion.section>

          {/* Empty state */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-8 md:p-12 text-center"
          >
            <div className="mx-auto h-14 w-14 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/30 grid place-items-center text-fuchsia-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl md:text-2xl font-bold text-white">
              Seu feed ainda está vazio
            </h2>
            <p className="mt-2 text-sm text-white/75 max-w-md mx-auto leading-relaxed">
              Assim que você começar a seguir creators, os posts mais recentes aparecem aqui em tempo real.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-sm font-semibold shadow-lg shadow-purple-500/30 hover:opacity-90 transition-opacity"
            >
              Ir para o painel
            </Link>
        </motion.section>
      </main>
    </div>
  );
}

function IconButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="h-9 w-9 grid place-items-center rounded-full bg-white/10 border border-white/15 text-white/85 hover:bg-white/15 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}
