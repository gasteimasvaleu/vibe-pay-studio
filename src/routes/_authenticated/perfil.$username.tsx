import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
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
import { PublicationCard } from "@/components/feed/PublicationCard";
import { CommentsSheet } from "@/components/feed/CommentsSheet";
import { PaymentModal, type CheckoutData, type PaymentMethod } from "@/components/payments/PaymentModal";
import { PaymentMethodDialog } from "@/components/payments/PaymentMethodDialog";
import { CpfPromptDialog } from "@/components/payments/CpfPromptDialog";
import { getUserPublications, type FeedItem } from "@/lib/publications.functions";
import { createUnlockPayment } from "@/lib/payments.functions";
import { payWithWallet } from "@/lib/wallet-pay.functions";


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
    if (profile.account_type !== "creator") throw notFound();

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
  notFoundComponent: () => <CreatorGatedNotFound />,
});

function CreatorGatedNotFound() {
  const router = useRouter();
  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 opacity-70" style={{ background: "var(--gradient-radial)" }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

      <header className="relative z-10 border-b border-black/10 bg-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3 text-black">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-black/80 hover:bg-black/10 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold truncate">Perfil</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="relative z-10 max-w-xl mx-auto px-4 md:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-primary/30 bg-card shadow-card p-6 md:p-8 text-center"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl grid place-items-center bg-gradient-to-br from-fuchsia-500 to-purple-700 shadow-lg shadow-fuchsia-500/30">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-5 text-xl md:text-2xl font-black text-foreground">
            Perfil disponível apenas para creators
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A página individual de perfil é exclusiva de contas creator. Ao virar creator,
            você também ganha sua página pública e passa a monetizar seu conteúdo.
          </p>

          <ul className="mt-6 space-y-3 text-left">
            <BenefitItem icon={<DollarSign className="h-4 w-4" />} text="Monetize seu conteúdo com assinaturas e desbloqueios" />
            <BenefitItem icon={<Heart className="h-4 w-4" />} text="Receba gorjetas e interaja com fãs" />
            <BenefitItem icon={<BadgeCheck className="h-4 w-4" />} text="Tenha uma página de perfil pública e verificável" />
          </ul>

          <Link
            to="/creator/onboarding/assinatura"
            className="mt-7 inline-flex w-full items-center justify-center h-12 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-fuchsia-500/30 hover:opacity-95 transition-opacity"
          >
            Criar perfil de creator
          </Link>
          <Link
            to="/feed"
            className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar ao feed
          </Link>
        </motion.div>
      </main>
    </div>
  );
}

function BenefitItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3">
      <span className="h-8 w-8 shrink-0 rounded-full grid place-items-center bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-sm text-foreground">{text}</span>
    </li>
  );
}


function PerfilPage() {
  const { viewerId, profile, postsCount, mediaCount, photosCount, videosCount, lockedCount, likesCount } =
    Route.useRouteContext();
  const router = useRouter();
  const isOwner = viewerId === profile.userId;
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipPubId, setTipPubId] = useState<string | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);

  const queryClient = useQueryClient();
  const fetchUserPubs = useServerFn(getUserPublications);
  const unlockFn = useServerFn(createUnlockPayment);
  const walletPay = useServerFn(payWithWallet);
  const [commentsFor, setCommentsFor] = useState<FeedItem | null>(null);
  const [pending, setPending] = useState<FeedItem | null>(null);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [cpfPromptFor, setCpfPromptFor] = useState<PaymentMethod | null>(null);

  const pubsQueryKey = ["user-publications", profile.userId] as const;
  const pubsQuery = useQuery({
    queryKey: pubsQueryKey,
    queryFn: () => fetchUserPubs({ data: { userId: profile.userId, limit: 20 } }),
  });

  const handleUnlock = (item: FeedItem) => {
    if (unlocking) return;
    setPending(item);
  };

  const confirmPayment = async (method: PaymentMethod) => {
    if (!pending) return;
    const item = pending;
    setUnlocking(item.id);
    try {
      if (method === "WALLET") {
        await walletPay({
          data: { kind: "publication_unlock", publicationId: item.id },
        });
        setPending(null);
        toast.success("Publicação desbloqueada!");
        void queryClient.invalidateQueries({ queryKey: pubsQueryKey });
        void queryClient.invalidateQueries({ queryKey: ["feed"] });
        void queryClient.invalidateQueries({ queryKey: ["subscriber-wallet"] });
        return;
      }
      const res = await unlockFn({
        data: { publicationId: item.id, method },
      });
      setPending(null);
      setCheckout({
        paymentIntentId: res.paymentIntentId,
        method,
        pixQrCode: res.pixQrCode,
        pixCopyPaste: res.pixCopyPaste,
        invoiceUrl: res.invoiceUrl,
      });
      setModalOpen(true);
    } catch (e: any) {
      if (e?.message === "cpf_required") {
        setCpfPromptFor(method);
        return;
      }
      if (e?.message === "publicação já desbloqueada" || e?.message === "already_unlocked") {
        setPending(null);
        await queryClient.invalidateQueries({ queryKey: pubsQueryKey });
        toast.success("Publicação já desbloqueada");
        return;
      }
      if (e?.message === "insufficient_funds") {
        toast.error("Saldo insuficiente na carteira");
        return;
      }
      toast.error(e?.message ?? "Erro ao gerar pagamento");
    } finally {
      setUnlocking(null);
    }
  };


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

          <TabsContent value="posts" className="mt-6 space-y-4">
            {pubsQuery.isLoading ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-8 text-center text-white/70 text-sm">
                Carregando publicações...
              </div>
            ) : pubsQuery.data && pubsQuery.data.items.length > 0 ? (
              pubsQuery.data.items.map((item) => (
                <PublicationCard
                  key={item.id}
                  item={item}
                  onUnlock={handleUnlock}
                  onComment={setCommentsFor}
                  onTip={(it) => {
                    setTipPubId(it.id);
                    setTipOpen(true);
                  }}
                />
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-8 text-center text-white/70 text-sm">
                {isOwner
                  ? "Você ainda não publicou nada."
                  : "Este creator ainda não publicou nada."}
              </div>
            )}
          </TabsContent>

          <TabsContent value="midias" className="mt-6">
            {(() => {
              const items = pubsQuery.data?.items ?? [];
              const tiles = items.flatMap((it) =>
                it.media.map((m) => ({ ...m, pub: it })),
              );
              if (pubsQuery.isLoading) {
                return (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-8 text-center text-white/70 text-sm">
                    Carregando mídias...
                  </div>
                );
              }
              if (tiles.length === 0) {
                return (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-8 text-center text-white/70 text-sm">
                    Nenhuma mídia disponível ainda.
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-3 gap-2">
                  {tiles.map((tile) => {
                    const locked = tile.pub.locked;
                    return (
                      <button
                        key={`${tile.pub.id}-${tile.id}`}
                        type="button"
                        onClick={() => {
                          if (locked) handleUnlock(tile.pub);
                        }}
                        className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40 group"
                      >
                        {tile.type === "image" ? (
                          <img
                            src={tile.url}
                            alt=""
                            className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${
                              locked ? "blur-xl scale-110" : ""
                            }`}
                          />
                        ) : (
                          <video
                            src={tile.url}
                            className={`w-full h-full object-cover ${locked ? "blur-xl scale-110" : ""}`}
                            muted
                            playsInline
                          />
                        )}
                        {locked && (
                          <div className="absolute inset-0 bg-black/40 grid place-items-center">
                            <Lock className="h-6 w-6 text-white/90" />
                          </div>
                        )}
                        {tile.type === "video" && !locked && (
                          <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 grid place-items-center">
                            <Film className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
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

      <PaymentMethodDialog
        open={!!pending}
        onOpenChange={(v) => !v && setPending(null)}
        title="Desbloquear publicação"
        amountCents={pending?.price_cents ?? 0}
        loading={!!unlocking}
        onConfirm={confirmPayment}
      />

      <PaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Desbloquear publicação"
        checkout={checkout}
        onPaid={() => {
          toast.success("Pagamento confirmado!");
          setModalOpen(false);
          setCheckout(null);
          void queryClient.invalidateQueries({ queryKey: pubsQueryKey });
        }}
      />

      <CommentsSheet
        publicationId={commentsFor?.id ?? null}
        publicationAuthorId={commentsFor?.author_id}
        commentsDisabled={commentsFor?.comments_disabled}
        currentUserName={profile.username}
        open={!!commentsFor}
        onOpenChange={(v) => !v && setCommentsFor(null)}
        onCountChange={(delta) => {
          const id = commentsFor?.id;
          if (!id) return;
          queryClient.setQueryData<{ items: FeedItem[]; nextCursor: string | null }>(
            pubsQueryKey,
            (prev) =>
              prev
                ? {
                    ...prev,
                    items: prev.items.map((it) =>
                      it.id === id
                        ? { ...it, comment_count: Math.max(0, it.comment_count + delta) }
                        : it,
                    ),
                  }
                : prev,
          );
        }}
      />

      <CpfPromptDialog
        open={!!cpfPromptFor}
        onOpenChange={(v) => !v && setCpfPromptFor(null)}
        onSaved={() => {
          const method = cpfPromptFor;
          setCpfPromptFor(null);
          if (method) void confirmPayment(method);
        }}
      />

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
