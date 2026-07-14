import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFeed, type FeedItem } from "@/lib/publications.functions";
import { createUnlockPayment } from "@/lib/payments.functions";
import { PublicationCard } from "@/components/feed/PublicationCard";
import { CommentsSheet } from "@/components/feed/CommentsSheet";
import { PaymentModal, type CheckoutData, type PaymentMethod } from "@/components/payments/PaymentModal";
import { PaymentMethodDialog } from "@/components/payments/PaymentMethodDialog";
import { CpfPromptDialog } from "@/components/payments/CpfPromptDialog";
import { useCpfGuard } from "@/hooks/useCpfGuard";


export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Seu feed · Monetisexy" },
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
  const queryClient = useQueryClient();
  const fetchFeed = useServerFn(getFeed);
  const unlock = useServerFn(createUnlockPayment);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [pending, setPending] = useState<FeedItem | null>(null);
  const [commentsFor, setCommentsFor] = useState<FeedItem | null>(null);
  const [cpfPromptFor, setCpfPromptFor] = useState<PaymentMethod | null>(null);


  const feedQuery = useQuery({
    queryKey: ["feed"],
    queryFn: () => fetchFeed({ data: { limit: 20 } }),
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
      const res = await unlock({
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
      toast.error(e?.message ?? "Erro ao gerar pagamento");
    } finally {
      setUnlocking(null);
    }
  };



  return (
    <div className="relative min-h-screen text-white overflow-hidden bg-[#0b0518]">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]" />

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

          {/* Feed items */}
          {feedQuery.isLoading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-8 text-center text-white/70 text-sm">
              Carregando publicações...
            </div>
          ) : feedQuery.data && feedQuery.data.items.length > 0 ? (
            <div className="space-y-4">
              {feedQuery.data.items.map((item) => (
                <PublicationCard key={item.id} item={item} onUnlock={handleUnlock} onComment={setCommentsFor} />
              ))}
            </div>
          ) : (
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
          toast.success("Pagamento confirmado! Recarregando feed...");
          feedQuery.refetch();
        }}
      />

      <CommentsSheet
        publicationId={commentsFor?.id ?? null}
        publicationAuthorId={commentsFor?.author_id}
        commentsDisabled={commentsFor?.comments_disabled}
        currentUserName={username}
        open={!!commentsFor}
        onOpenChange={(v) => !v && setCommentsFor(null)}
        onCountChange={(delta) => {
          const id = commentsFor?.id;
          if (!id) return;
          queryClient.setQueryData<{ items: FeedItem[]; nextCursor: string | null }>(
            ["feed"],
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

