import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  useInfiniteQuery,
  useQueryClient,
  useSuspenseQuery,
  queryOptions,
  type InfiniteData,
} from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { CircularSteps } from "@/components/feed/CircularSteps";
import { StoriesCarousel } from "@/components/feed/StoriesCarousel";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { getFeed, type FeedItem } from "@/lib/publications.functions";
import { createUnlockPayment } from "@/lib/payments.functions";
import { payWithWallet } from "@/lib/wallet-pay.functions";
import { translatePaymentError } from "@/lib/payment-limits";
import { refreshAfterPayment } from "@/lib/refresh-after-payment";
import { useWaitForPaymentSettled } from "@/lib/wait-for-payment";
import { PublicationCard } from "@/components/feed/PublicationCard";
import { CommentsSheet } from "@/components/feed/CommentsSheet";
import { PaymentModal, type CheckoutData, type PaymentMethod } from "@/components/payments/PaymentModal";
import { PaymentMethodDialog } from "@/components/payments/PaymentMethodDialog";
import { CpfPromptDialog } from "@/components/payments/CpfPromptDialog";
import { TipDialog } from "@/components/payments/TipDialog";
import { ChallengeContributeSheet } from "@/components/payments/ChallengeContributeSheet";
import {
  getFeedWelcomeSeen,
  markFeedWelcomeSeen,
} from "@/lib/feed-welcome.functions";




export const welcomeQueryOptions = () =>
  queryOptions({
    queryKey: ["feed-welcome-seen"],
    queryFn: () => getFeedWelcomeSeen(),
  });

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Seu feed · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw redirect({ to: "/entrar" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type, username, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    return {
      userId: user.id,
      username: profile?.username ?? user.email?.split("@")[0] ?? "voce",
      accountType: profile?.account_type ?? "subscriber",
      avatarUrl: (profile?.avatar_url as string | null) ?? null,
    };
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(welcomeQueryOptions()),
  component: FeedPage,
});

function FeedPage() {
  const { username, userId, accountType, avatarUrl } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const fetchFeed = useServerFn(getFeed);
  const unlock = useServerFn(createUnlockPayment);
  const waitForSettled = useWaitForPaymentSettled();
  const walletPay = useServerFn(payWithWallet);
  const markWelcome = useServerFn(markFeedWelcomeSeen);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [paidItemId, setPaidItemId] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [pending, setPending] = useState<FeedItem | null>(null);
  const [commentsFor, setCommentsFor] = useState<FeedItem | null>(null);
  const [cpfPromptFor, setCpfPromptFor] = useState<PaymentMethod | null>(null);
  const [tipFor, setTipFor] = useState<FeedItem | null>(null);
  const [challengeFor, setChallengeFor] = useState<FeedItem | null>(null);
  const [challengeTier, setChallengeTier] = useState<number | null>(null);

  const { data: welcomeData } = useSuspenseQuery(welcomeQueryOptions());
  const welcomeSeen = welcomeData?.seen ?? true;

  const dismissWelcome = async () => {
    try {
      await markWelcome();
      await queryClient.invalidateQueries({ queryKey: ["feed-welcome-seen"] });
    } catch (e: any) {
      toast.error("Erro ao salvar preferência. Tente novamente.");
    }
  };

  const feedQuery = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) =>
      fetchFeed({ data: { limit: 20, cursor: pageParam ?? undefined } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: welcomeSeen,
  });

  const feedItems = feedQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const sentinelRef = useInfiniteScrollSentinel<HTMLDivElement>({
    hasNextPage: feedQuery.hasNextPage,
    isFetchingNextPage: feedQuery.isFetchingNextPage,
    fetchNextPage: feedQuery.fetchNextPage,
  });

  const handleUnlock = (item: FeedItem) => {
    if (unlocking) return;
    if (item.visibility === "challenge") {
      setChallengeTier(null);
      setChallengeFor(item);
      return;
    }
    setPending(item);
  };

  const handleChallengeTierSelect = (item: FeedItem, tierCents: number) => {
    setChallengeTier(tierCents);
    setChallengeFor(item);
  };

  const isItemUnlocked = (id: string) => {
    const data = queryClient.getQueryData<
      InfiniteData<{ items: FeedItem[]; nextCursor: string | null }>
    >(["feed"]);
    return !!data?.pages.some((p) =>
      p.items.some((it) => it.id === id && !it.locked),
    );
  };

  /** Refetch automático até a publicação aparecer desbloqueada. */
  const refreshUnlocked = (publicationId: string) =>
    refreshAfterPayment(queryClient, ["feed", "subscriber-wallet"], {
      until: () => isItemUnlocked(publicationId),
    });

  const confirmPayment = async (method: PaymentMethod, savedCardId: string | null = null) => {
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
        await refreshUnlocked(item.id);
        return;
      }
      const res = await unlock({
        data: { publicationId: item.id, method, savedCardId: method === "CREDIT_CARD" ? savedCardId : null },
      });
      if (res.paidImmediately) {
        setPending(null);
        toast.loading("Confirmando pagamento...", { id: "feed-unlock" });
        await waitForSettled(res.paymentIntentId);
        toast.success("Publicação desbloqueada!", { id: "feed-unlock" });
        await refreshUnlocked(item.id);
        return;
      }
      setPending(null);
      setPaidItemId(item.id);
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
        await queryClient.invalidateQueries({ queryKey: ["feed"] });
        toast.success("Publicação já desbloqueada");
        return;
      }
      toast.error(translatePaymentError(e, "Erro ao gerar pagamento"));
    } finally {
      setUnlocking(null);
    }
  };



  const welcomeSteps = [
    {
      subtitle: "Passo 1",
      title: "Você chegou!",
      description:
        "Aqui você tem acesso direto aos criadores que mais gosta, com conteúdos que você não encontra em nenhum outro lugar.",
      src: "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/openart-image_1784622024885_9b463187_1784622025991_241a55cc.png",
    },
    {
      subtitle: "Passo 2",
      title: "Em Alta",
      description:
        "Descubra novos creators e veja como eles mais interagem: chamadas de vídeo, chats, posts no feed, mimos e muito mais.",
      src: "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/openart-image_1784622105669_f17e2279_1784622106666_13d91818.png",
    },
    {
      subtitle: "Passo 3",
      title: "Conheça o Mural",
      description:
        "O mural é seu espaço para explorar e encontrar creators que combinam com você. Lifestyle, dia a dia, estética, posts inspiradores e muito mais.",
      src: "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/openart-image_1784622441232_336327f6_1784622442736_9e654942.png",
    },
    {
      subtitle: "Passo 4",
      title: "Se interessou?",
      description:
        "Assine perfis gratuitos e comece a ter uma experiência mais próxima do creator. Descubra conteúdos, interaja e veja como é estar por dentro do mundo deles.",
      src: "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/openart-image_1784622583046_6307d7aa_1784622584052_e08a8ea3.png",
    },
    {
      subtitle: "Passo 5",
      title: "Assinou?",
      description:
        "Aqui você pode conversar pelo chat, desbloquear posts exclusivos e até realizar a Chamada Um a Um com o criador.",
      src: "https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/openart-image_1784622801840_727ff900_1784622802895_bfe312fe.png",
    },
  ];

  if (!welcomeSeen) {
    return (
      <div className="relative min-h-screen text-white overflow-hidden bg-[#0b0518]">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-70"
          style={{ background: "var(--gradient-radial)" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 md:px-6 py-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="w-full max-w-5xl rounded-3xl border border-border bg-card backdrop-blur-md p-4 md:p-6"
          >
            <CircularSteps
              steps={welcomeSteps}
              onDismiss={dismissWelcome}
              showDoneButton
              onDone={dismissWelcome}
            />
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-[#0b0518]">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Stories */}
        <StoriesCarousel
          currentUserId={userId}
          currentUsername={username}
          currentAvatarUrl={avatarUrl}
          canPublish={accountType === "creator" || accountType === "free_creator"}
        />

        {/* Feed items */}
        {feedQuery.isLoading ? (
          <div className="rounded-3xl border border-border bg-card backdrop-blur-md p-8 text-center text-muted-foreground text-sm">
            Carregando publicações...
          </div>
        ) : feedItems.length > 0 ? (
          <div className="space-y-4">
            {feedItems.map((item) => (
              <PublicationCard key={item.id} item={item} onUnlock={handleUnlock} onComment={setCommentsFor} onTip={setTipFor} onChallengeTierSelect={handleChallengeTierSelect} />
            ))}
            <div ref={sentinelRef} className="h-8" />
            {feedQuery.isFetchingNextPage && (
              <div className="flex justify-center py-4 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {!feedQuery.hasNextPage && (
              <p className="text-center text-xs text-muted-foreground py-4">Você chegou ao fim do feed.</p>
            )}
          </div>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl border border-border bg-card backdrop-blur-md p-8 text-center"
          >
            <p className="text-muted-foreground text-sm">
              Nenhuma publicação por enquanto. Siga creators para ver mais conteúdo.
            </p>
          </motion.section>
        )}
      </main>

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
          toast.success("Pagamento confirmado! Liberando conteúdo...");
          setModalOpen(false);
          setCheckout(null);
          const id = paidItemId;
          setPaidItemId(null);
          void (id
            ? refreshUnlocked(id)
            : refreshAfterPayment(queryClient, ["feed", "subscriber-wallet"]));
        }}
      />

      <CommentsSheet
        publicationId={commentsFor?.id ?? null}
        publicationAuthorId={commentsFor?.author_id}
        commentsDisabled={commentsFor?.comments_disabled}
        currentUserName={username}
        currentUserAvatarUrl={avatarUrl}

        open={!!commentsFor}
        onOpenChange={(v) => !v && setCommentsFor(null)}
        onCountChange={(delta) => {
          const id = commentsFor?.id;
          if (!id) return;
          queryClient.setQueryData<InfiniteData<{ items: FeedItem[]; nextCursor: string | null }>>(
            ["feed"],
            (prev) =>
              prev
                ? {
                    ...prev,
                    pages: prev.pages.map((page) => ({
                      ...page,
                      items: page.items.map((it) =>
                        it.id === id
                          ? { ...it, comment_count: Math.max(0, it.comment_count + delta) }
                          : it,
                      ),
                    })),
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

      <TipDialog
        open={!!tipFor}
        onOpenChange={(v) => !v && setTipFor(null)}
        creatorId={tipFor?.author_id ?? ""}
        creatorName={tipFor?.author_username ?? "creator"}
        publicationId={tipFor?.id}
      />

      <ChallengeContributeSheet
        publicationId={challengeFor?.id ?? null}
        creatorName={challengeFor?.author_username}
        open={!!challengeFor}
        onOpenChange={(v) => {
          if (!v) {
            setChallengeFor(null);
            setChallengeTier(null);
          }
        }}
        preselectedTierCents={challengeTier}
        onContributed={() => {
          void queryClient.invalidateQueries({ queryKey: ["feed"] });
        }}
      />
    </div>
  );
}
