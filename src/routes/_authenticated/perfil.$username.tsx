import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  ChevronDown,
  Clapperboard,
  DollarSign,
  Film,
  Flag,
  Heart,
  Image as ImageIcon,
  Instagram,
  Lock,
  MapPin,
  MessageCircle,
  MoreVertical,
  Music2,
  Share2,
  Smartphone,
  Twitter,
  UserPlus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SubscribeDialog } from "@/components/payments/SubscribeDialog";
import { TipDialog } from "@/components/payments/TipDialog";

export const Route = createFileRoute("/_authenticated/perfil/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} · Monetisexy` },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ params }) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/entrar" });


    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, username, account_type, price_monthly, discount_quarterly, discount_semiannual")
      .eq("username", params.username)
      .maybeSingle();

    if (!profile) throw notFound();

    const [
      { count: postsCount },
      { count: mediaCount },
      { count: photosCount },
      { count: videosCount },
      { count: lockedCount },
      { count: likesCount },
    ] = await Promise.all([
      supabase
        .from("publications")
        .select("id", { count: "exact", head: true })
        .eq("author_id", profile.user_id),
      supabase
        .from("publication_media")
        .select("id, publications!inner(author_id)", { count: "exact", head: true })
        .eq("publications.author_id", profile.user_id),
      supabase
        .from("publication_media")
        .select("id, publications!inner(author_id)", { count: "exact", head: true })
        .eq("publications.author_id", profile.user_id)
        .eq("type", "image"),
      supabase
        .from("publication_media")
        .select("id, publications!inner(author_id)", { count: "exact", head: true })
        .eq("publications.author_id", profile.user_id)
        .eq("type", "video"),
      supabase
        .from("publications")
        .select("id", { count: "exact", head: true })
        .eq("author_id", profile.user_id)
        .neq("visibility", "public"),
      supabase
        .from("publication_likes")
        .select("publication_id, publications!inner(author_id)", { count: "exact", head: true })
        .eq("publications.author_id", profile.user_id),
    ]);

    return {
      viewerId: userData.user.id,
      profile: {
        userId: profile.user_id,
        username: profile.username,
        accountType: profile.account_type,
        priceMonthly: Number(profile.price_monthly ?? 0),
        discountQuarterly: profile.discount_quarterly ?? 0,
        discountSemiannual: profile.discount_semiannual ?? 0,
      },
      postsCount: postsCount ?? 0,
      mediaCount: mediaCount ?? 0,
      photosCount: photosCount ?? 0,
      videosCount: videosCount ?? 0,
      lockedCount: lockedCount ?? 0,
      likesCount: likesCount ?? 0,
    };
  },


  component: PerfilPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-white grid place-items-center p-6">
      <p className="text-sm text-white/70">Não foi possível carregar o perfil: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-white grid place-items-center p-6 text-center">
      <div>
        <p className="text-lg font-semibold">Perfil não encontrado</p>
        <Link to="/feed" className="mt-3 inline-block text-sm text-fuchsia-300 hover:text-fuchsia-200">
          Voltar ao feed
        </Link>
      </div>
    </div>
  ),
});

type ProfilePost = {
  id: string;
  time: string;
  photos: number;
  videos: number;
  likes: number;
  gradient: string;
};

const MOCK_POSTS: ProfilePost[] = [
  { id: "1", time: "há 2 h", photos: 12, videos: 3, likes: 421, gradient: "from-fuchsia-500 via-purple-500 to-indigo-600" },
  { id: "2", time: "há 1 d", photos: 8, videos: 1, likes: 289, gradient: "from-amber-400 via-pink-500 to-fuchsia-600" },
  { id: "3", time: "há 3 d", photos: 20, videos: 5, likes: 1204, gradient: "from-cyan-400 via-purple-500 to-fuchsia-600" },
];

function PerfilPage() {
  const { viewerId, profile, postsCount, mediaCount, photosCount, videosCount, lockedCount, likesCount } =
    Route.useRouteContext();
  const router = useRouter();
  const isOwner = viewerId === profile.userId;
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipPubId, setTipPubId] = useState<string | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);

  const formatCompact = (n: number) =>
    new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const stats = {
    fotos: photosCount,
    videos: videosCount,
    locked: lockedCount,
    likes: formatCompact(likesCount),
  };

  const displayName = profile.username
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
  const location = "São Paulo - BRA";
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const monthlyPrice = profile.priceMonthly > 0 ? profile.priceMonthly : 0;
  const quarterlyPrice = monthlyPrice * 3 * (1 - (profile.discountQuarterly ?? 0) / 100);
  const semiannualPrice = monthlyPrice * 6 * (1 - (profile.discountSemiannual ?? 0) / 100);
  const hasPromotions =
    monthlyPrice > 0 &&
    ((profile.discountQuarterly ?? 0) > 0 || (profile.discountSemiannual ?? 0) > 0);


  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 opacity-70" style={{ background: "var(--gradient-radial)" }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

      {/* Topbar */}
      <header className="relative z-10 border-b border-black/10 bg-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3 text-black">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-black/80 hover:bg-black/10 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold truncate">{displayName}</h1>
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                className="h-9 w-9 grid place-items-center rounded-full text-black/80 hover:bg-black/10 transition-colors"
                aria-label="Mais opções"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-64 rounded-3xl p-3 bg-card border border-border shadow-xl"
            >
              <nav className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    const url = window.location.href;
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: displayName, url });
                      } catch {
                        // usuário cancelou
                      }
                    } else if (navigator.clipboard) {
                      await navigator.clipboard.writeText(url);
                      alert("Link copiado para a área de transferência!");
                    }
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-semibold text-foreground hover:bg-foreground/5 transition-colors"
                >
                  <Share2 className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  Compartilhar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("Denúncia enviada. Nossa equipe irá analisar este perfil.");
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-semibold text-foreground hover:bg-foreground/5 transition-colors"
                >
                  <Flag className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  Denunciar perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert(`Solicitação de amizade enviada para ${displayName}!`);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-semibold text-foreground hover:bg-foreground/5 transition-colors"
                >
                  <UserPlus className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  Adicionar amigo
                </button>
              </nav>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Cover + avatar + stats */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="relative h-44 md:h-56 rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
          </div>

          {/* Avatar */}
          <div className="absolute left-4 md:left-6 -bottom-10">
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full border-4 border-background bg-gradient-to-br from-fuchsia-500 to-purple-700 grid place-items-center text-3xl font-black shadow-xl shadow-purple-900/40">
              {profile.username.slice(0, 1).toUpperCase()}
            </div>
          </div>

          {/* Stats */}
          <div className="absolute right-4 md:right-6 bottom-4 hidden sm:flex items-center gap-4 rounded-full bg-black/40 backdrop-blur-md border border-white/15 px-4 py-2 text-xs">
            <Stat icon={<ImageIcon className="h-4 w-4" />} value={stats.fotos} />
            <Stat icon={<Film className="h-4 w-4" />} value={stats.videos} />
            <Stat icon={<Lock className="h-4 w-4" />} value={stats.locked} />
            <Stat icon={<Heart className="h-4 w-4" />} value={stats.likes} />
          </div>
        </motion.section>

        {/* Identity */}
        <div className="-mt-8 md:-mt-10 pt-12 md:pt-14 pb-4 md:pb-6 pl-4 md:pl-6 space-y-3 bg-card rounded-3xl rounded-t-none shadow-card border border-primary/30">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-foreground">{displayName}</h2>
            <BadgeCheck className="h-6 w-6 text-fuchsia-400 fill-fuchsia-400/20" />
          </div>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>

          {/* Mobile stats */}
          <div className="sm:hidden flex items-center gap-4 text-xs text-muted-foreground">
            <Stat icon={<ImageIcon className="h-4 w-4" />} value={stats.fotos} variant="light" />
            <Stat icon={<Film className="h-4 w-4" />} value={stats.videos} variant="light" />
            <Stat icon={<Lock className="h-4 w-4" />} value={stats.locked} variant="light" />
            <Stat icon={<Heart className="h-4 w-4" />} value={stats.likes} variant="light" />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <SocialButton label="Instagram"><Instagram className="h-4 w-4" /></SocialButton>
            <SocialButton label="X"><Twitter className="h-4 w-4" /></SocialButton>
            <SocialButton label="TikTok"><Music2 className="h-4 w-4" /></SocialButton>
          </div>

          {isOwner && (
            <div className="pr-4 md:pr-6">
              <Link
                to="/settings/creator"
                className="flex items-center justify-center w-full h-9 rounded-xl border border-primary/30 bg-secondary text-sm font-semibold text-secondary-foreground hover:bg-muted transition-colors"
              >
                Editar perfil
              </Link>
            </div>
          )}
        </div>

        {/* Assinaturas */}
        {!isOwner && monthlyPrice > 0 && (
          <SubscriptionPlansCard
            monthly={monthlyPrice}
            quarterly={quarterlyPrice}
            semiannual={semiannualPrice}
            hasPromotions={hasPromotions}
            onSelect={() => setSubscribeOpen(true)}
            format={(v) => brl.format(v)}
          />
        )}


        {/* Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full h-12 rounded-full bg-card border border-border p-0 overflow-hidden">
            <TabsTrigger
              value="posts"
              className="flex-1 h-full gap-2 rounded-none bg-transparent text-sm font-semibold text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
            >
              <Smartphone className="h-4 w-4" />
              {postsCount} Postagens
            </TabsTrigger>
            <TabsTrigger
              value="midias"
              className="flex-1 h-full gap-2 rounded-none border-l border-border bg-transparent text-sm font-semibold text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
            >
              <Clapperboard className="h-4 w-4" />
              {mediaCount} Mídias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6 space-y-5">
            {MOCK_POSTS.map((post, i) => (
              <ProfilePostCard
                key={post.id}
                post={post}
                username={profile.username}
                displayName={displayName}
                delay={i * 0.05}
                onTip={() => {
                  setTipPubId(undefined);
                  setTipOpen(true);
                }}
              />
            ))}
          </TabsContent>

          <TabsContent value="midias" className="mt-6">
            <div className="grid grid-cols-3 gap-2">
              {MOCK_POSTS.flatMap((p) =>
                Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={`${p.id}-${idx}`}
                    className={`aspect-square rounded-xl bg-gradient-to-br ${p.gradient} relative overflow-hidden border border-white/10`}
                  >
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-md grid place-items-center">
                      <Lock className="h-6 w-6 text-white/80" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {!isOwner && (
        <>
          <SubscribeDialog
            open={subscribeOpen}
            onOpenChange={setSubscribeOpen}
            creatorId={profile.userId}
            creatorName={displayName}
          />
          <TipDialog
            open={tipOpen}
            onOpenChange={setTipOpen}
            creatorId={profile.userId}
            creatorName={displayName}
            publicationId={tipPubId}
          />
        </>
      )}
    </div>
  );
}

function SubscriptionPlansCard({
  monthly,
  quarterly,
  semiannual,
  hasPromotions,
  onSelect,
  format,
}: {
  monthly: number;
  quarterly: number;
  semiannual: number;
  hasPromotions: boolean;
  onSelect: () => void;
  format: (v: number) => string;
}) {
  const [promoOpen, setPromoOpen] = useState(true);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground mb-2">Assinaturas</h3>
        <PlanPill label="1 mês" price={format(monthly)} onClick={onSelect} />
      </div>

      {hasPromotions && (
        <div>
          <button
            type="button"
            onClick={() => setPromoOpen((v) => !v)}
            className="w-full flex items-center justify-between mb-2"
          >
            <h3 className="text-base font-bold text-foreground">Promoções</h3>
            <ChevronDown
              className={`h-5 w-5 text-foreground transition-transform ${promoOpen ? "" : "-rotate-90"}`}
            />
          </button>
          {promoOpen && (
            <div className="space-y-2">
              <PlanPill label="3 meses" price={format(quarterly)} onClick={onSelect} />
              <PlanPill label="6 meses" price={format(semiannual)} onClick={onSelect} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanPill({
  label,
  price,
  onClick,
}: {
  label: string;
  price: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-12 px-5 rounded-full flex items-center justify-between bg-gradient-primary text-primary-foreground font-semibold shadow-md hover:brightness-105 transition"
    >
      <span>{label}</span>
      <span>{price}</span>
    </button>
  );
}


function Stat({
  icon,
  value,
  variant = "dark",
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  variant?: "dark" | "light";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${
        variant === "dark" ? "text-white/80" : "text-foreground"
      }`}
    >
      <span className={variant === "dark" ? "text-white/60" : "text-muted-foreground"}>{icon}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function SocialButton({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="h-9 w-9 grid place-items-center rounded-full bg-secondary border border-border text-secondary-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}

function ProfilePostCard({
  post,
  username,
  displayName,
  delay,
  onTip,
}: {
  post: ProfilePost;
  username: string;
  displayName: string;
  delay: number;
  onTip?: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-border bg-card backdrop-blur-md overflow-hidden text-foreground"
    >
      <div className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 grid place-items-center font-bold shrink-0 text-white">
          {username.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <BadgeCheck className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground truncate">@{username} · {post.time}</p>
        </div>
        <button className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Mais">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      <div className={`aspect-[16/10] w-full relative bg-gradient-to-br ${post.gradient}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-white/10 border border-white/20 grid place-items-center">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <div className="flex items-center gap-4 text-xs text-white">
              <Stat icon={<ImageIcon className="h-4 w-4" />} value={post.photos} />
              <Stat icon={<Film className="h-4 w-4" />} value={post.videos} />
              <Stat icon={<Heart className="h-4 w-4" />} value={post.likes} />
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <IconAction
            active={liked}
            onClick={() => setLiked((v) => !v)}
            label="Curtir"
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
          </IconAction>
          <IconAction label="Comentar"><MessageCircle className="h-5 w-5" /></IconAction>
          <IconAction label="Enviar gorjeta" onClick={onTip}><DollarSign className="h-5 w-5" /></IconAction>
        </div>
        <IconAction
          active={saved}
          onClick={() => setSaved((v) => !v)}
          label="Salvar"
        >
          <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
        </IconAction>
      </div>
    </motion.article>
  );
}

function IconAction({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`h-9 w-9 grid place-items-center rounded-full transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
