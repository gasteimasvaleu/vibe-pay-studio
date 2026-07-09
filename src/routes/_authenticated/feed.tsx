import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Compass, Heart, Home, MessageCircle, Plus, Search, Settings, User } from "lucide-react";
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

type Post = {
  id: string;
  creator: string;
  handle: string;
  time: string;
  text: string;
  likes: number;
  comments: number;
  gradient: string;
};

const MOCK_POSTS: Post[] = [
  {
    id: "1",
    creator: "Luna Ribeiro",
    handle: "lunaribeiro",
    time: "há 12 min",
    text: "Novo pack exclusivo no ar 💜 Comentem quem já viu!",
    likes: 342,
    comments: 28,
    gradient: "from-fuchsia-500 via-purple-500 to-indigo-600",
  },
  {
    id: "2",
    creator: "Théo Martins",
    handle: "theomartins",
    time: "há 1 h",
    text: "Live hoje 22h para os assinantes VIP. Preparados?",
    likes: 187,
    comments: 14,
    gradient: "from-amber-400 via-pink-500 to-fuchsia-600",
  },
  {
    id: "3",
    creator: "Isa Costa",
    handle: "isacosta",
    time: "há 3 h",
    text: "Obrigada por 10k assinantes 🖤 Sem vocês nada disso seria possível.",
    likes: 902,
    comments: 76,
    gradient: "from-cyan-400 via-purple-500 to-fuchsia-600",
  },
];

function FeedPage() {
  const { username } = Route.useRouteContext();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // placeholder para futura assinatura realtime
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Mesmo background do hero */}
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

      {/* Top bar */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-black/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <Link to="/feed" className="text-lg font-black tracking-tight">
            monet<span className="text-gradient-primary">isex</span>
          </Link>
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <label className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type="search"
                placeholder="Buscar creators, tags, posts..."
                className="w-full h-10 pl-10 pr-4 rounded-full bg-white/5 border border-white/10 text-sm placeholder:text-white/40 outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <IconButton aria-label="Notificações"><Bell className="h-5 w-5" /></IconButton>
            <IconButton aria-label="Mensagens"><MessageCircle className="h-5 w-5" /></IconButton>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="hidden sm:inline text-xs text-white/60 hover:text-white transition-colors px-3"
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_280px] gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            <SideItem icon={<Home className="h-5 w-5" />} label="Feed" active />
            <SideItem icon={<Compass className="h-5 w-5" />} label="Explorar" />
            <SideItem icon={<MessageCircle className="h-5 w-5" />} label="Mensagens" />
            <SideItem icon={<Bell className="h-5 w-5" />} label="Notificações" />
            <SideItem icon={<User className="h-5 w-5" />} label="Perfil" />
            <SideItem icon={<Settings className="h-5 w-5" />} label="Ajustes" />
          </nav>
        </aside>

        {/* Feed */}
        <main className="space-y-6">
          {/* Welcome */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a0b2e]/80 via-[#2a1250]/80 to-[#1a0b2e]/80 backdrop-blur-xl p-6"
          >
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-fuchsia-500/30 blur-3xl" />
            <p className="text-xs uppercase tracking-widest text-white/50">Feed</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight">
              Olá, @{username} 👋
            </h1>
            <p className="mt-2 text-sm text-white/70 max-w-md">
              Aqui você acompanha o que os creators que você segue estão postando em tempo real.
            </p>
          </motion.section>

          {/* Composer (placeholder) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center font-bold shrink-0">
              {username.slice(0, 1).toUpperCase()}
            </div>
            <button className="flex-1 text-left h-10 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-white/50 hover:bg-white/10 transition-colors">
              Compartilhe uma novidade...
            </button>
            <button className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 grid place-items-center shadow-lg shadow-purple-500/40">
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Posts */}
          {MOCK_POSTS.map((post, i) => (
            <PostCard key={post.id} post={post} delay={i * 0.05} />
          ))}
        </main>

        {/* Right rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
              <p className="text-xs uppercase tracking-widest text-white/50">Em alta</p>
              <ul className="mt-3 space-y-3 text-sm">
                {["#packvip", "#livehoje", "#novocreator", "#ensaio"].map((tag) => (
                  <li key={tag} className="flex items-center justify-between">
                    <span className="text-white/90">{tag}</span>
                    <span className="text-white/40 text-xs">{Math.floor(Math.random() * 900 + 100)} posts</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function IconButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="h-9 w-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}

function SideItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-white/10 text-white"
          : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PostCard({ post, delay }: { post: Post; delay: number }) {
  const [liked, setLiked] = useState(false);
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden"
    >
      <div className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${post.gradient} grid place-items-center font-bold shrink-0`}>
          {post.creator.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{post.creator}</p>
          <p className="text-xs text-white/50 truncate">@{post.handle} · {post.time}</p>
        </div>
        <button className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white text-[#2a1250] hover:bg-white/90 transition-colors">
          Assinar
        </button>
      </div>
      <div className={`aspect-[4/3] w-full bg-gradient-to-br ${post.gradient} relative`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_60%)]" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-white/80 text-xs uppercase tracking-widest border border-white/40 px-3 py-1 rounded-full backdrop-blur-sm">
            Conteúdo exclusivo
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-white/90 leading-relaxed">{post.text}</p>
        <div className="flex items-center gap-4 text-xs text-white/60">
          <button
            onClick={() => setLiked((v) => !v)}
            className={`inline-flex items-center gap-1.5 transition-colors ${liked ? "text-fuchsia-400" : "hover:text-white"}`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            {post.likes + (liked ? 1 : 0)}
          </button>
          <button className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
            <MessageCircle className="h-4 w-4" />
            {post.comments}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
