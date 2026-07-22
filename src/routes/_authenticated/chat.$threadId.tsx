import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, DollarSign, Lock, SendHorizontal } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getThreadWithPartner,
  markThreadRead,
  sendMessage,
  type ChatMessage,
} from "@/lib/chat.functions";
import { createChatUnlockPayment } from "@/lib/payments.functions";
import { payWithWallet } from "@/lib/wallet-pay.functions";
import { translatePaymentError } from "@/lib/payment-limits";
import { Textarea } from "@/components/ui/textarea";
import { ComposerIcon } from "@/components/chat/ComposerIcon";
import { PriceDialog } from "@/components/chat/PriceDialog";
import { PaymentModal, type CheckoutData, type PaymentMethod } from "@/components/payments/PaymentModal";
import { PaymentMethodDialog } from "@/components/payments/PaymentMethodDialog";
import { cn } from "@/lib/utils";
import { VideoCallHeaderButton } from "@/components/chat/VideoCallHeaderButton";


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  params: {
    parse: (raw) => {
      const threadId = String(raw.threadId ?? "");
      if (!UUID_RE.test(threadId)) throw notFound();
      return { threadId };
    },
    stringify: (params) => ({ threadId: params.threadId }),
  },
  component: ChatThreadView,
});

type ThreadData = {
  messages: ChatMessage[];
  partner: { userId: string; username: string; avatarUrl: string | null };
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function ChatThreadView() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getThreadFn = useServerFn(getThreadWithPartner);
  const sendFn = useServerFn(sendMessage);
  const markReadFn = useServerFn(markThreadRead);
  const unlockFn = useServerFn(createChatUnlockPayment);
  const walletPay = useServerFn(payWithWallet);

  const [meId, setMeId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<{ id: string; priceCents: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMeId(data.session?.user.id ?? null));
  }, []);

  const { data: accountType } = useQuery({
    queryKey: ["viewer-account-type"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return "subscriber" as const;
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("user_id", user.id)
        .maybeSingle();
      return (profile?.account_type ?? "subscriber") as
        | "subscriber"
        | "creator"
        | "free_creator";
    },
    staleTime: 5 * 60 * 1000,
  });
  const isCreator = accountType === "creator" || accountType === "free_creator";

  const { data, isLoading } = useQuery<ThreadData>({
    queryKey: ["chat", "messages", threadId],
    queryFn: () => getThreadFn({ data: { threadId } }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const m = payload.new as {
            id: string;
            thread_id: string;
            sender_id: string;
            content: string;
            read_at: string | null;
            created_at: string;
            price_cents: number | null;
            metadata: unknown;
          };
          const meta = m.metadata as { media?: unknown[]; storyReply?: unknown } | null;
          const hasMedia =
            !!meta && Array.isArray(meta.media) && (meta.media as unknown[]).length > 0;
          const hasStoryReply = !!meta && !!meta.storyReply;
          if (hasMedia || hasStoryReply) {
            // Needs server-signed URLs; refetch.
            queryClient.invalidateQueries({ queryKey: ["chat", "messages", threadId] });
            return;
          }

          queryClient.setQueryData<ThreadData>(
            ["chat", "messages", threadId],
            (old) => {
              if (!old) return old;
              if (old.messages.some((x) => x.id === m.id)) return old;
              const price = m.price_cents ?? 0;
              const mine = m.sender_id === meId;
              const newMsg: ChatMessage = {
                id: m.id,
                threadId: m.thread_id,
                senderId: m.sender_id,
                content: m.content,
                readAt: m.read_at,
                createdAt: m.created_at,
                priceCents: price > 0 ? price : null,
                unlocked: price <= 0 || mine,
                metadata: null,
              };
              return { ...old, messages: [...old.messages, newMsg] };
            },
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient, meId]);

  useEffect(() => {
    if (!data) return;
    markReadFn({ data: { threadId } })
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["chat", "threads"] }),
      )
      .catch(() => {});
  }, [data, threadId, markReadFn, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [data?.messages.length]);

  const sendMutation = useMutation({
    mutationFn: (vars: { content: string; priceCents: number | null }) =>
      sendFn({
        data: {
          threadId,
          content: vars.content,
          priceCents: vars.priceCents ?? 0,
        },
      }),
    onSuccess: (msg) => {
      queryClient.setQueryData<ThreadData>(
        ["chat", "messages", threadId],
        (old) => {
          if (!old) return old;
          if (old.messages.some((x) => x.id === msg.id)) return old;
          return { ...old, messages: [...old.messages, msg] };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao enviar"),
  });

  const handleSend = () => {
    const content = text.trim();
    if (!content || sendMutation.isPending) return;
    const price = priceCents;
    setText("");
    setPriceCents(null);
    sendMutation.mutate({ content, priceCents: price });
  };

  const handleUnlock = (messageId: string, priceCents: number) => {
    setPendingMsg({ id: messageId, priceCents });
  };

  const confirmUnlockPayment = async (method: PaymentMethod) => {
    if (!pendingMsg) return;
    const messageId = pendingMsg.id;
    try {
      setUnlockingId(messageId);
      if (method === "WALLET") {
        await walletPay({ data: { kind: "chat_unlock", messageId } });
        setPendingMsg(null);
        queryClient.invalidateQueries({ queryKey: ["chat", "messages", threadId] });
        queryClient.invalidateQueries({ queryKey: ["subscriber-wallet"] });
        toast.success("Mensagem desbloqueada");
        return;
      }
      const res = await unlockFn({ data: { messageId, method } });
      setPendingMsg(null);
      setCheckout({
        paymentIntentId: res.paymentIntentId,
        method,
        pixQrCode: res.pixQrCode,
        pixCopyPaste: res.pixCopyPaste,
        invoiceUrl: res.invoiceUrl,
      });
      setModalOpen(true);
    } catch (err: any) {
      if (err?.message === "already_unlocked") {
        setPendingMsg(null);
        queryClient.invalidateQueries({ queryKey: ["chat", "messages", threadId] });
        toast.success("Mensagem já desbloqueada");
        return;
      }
      toast.error(translatePaymentError(err, "Erro ao gerar pagamento"));
    } finally {
      setUnlockingId(null);
    }
  };

  const priceLabel = useMemo(
    () => (priceCents ? formatBRL(priceCents) : null),
    [priceCents],
  );

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-white">
      <header className="h-16 shrink-0 flex items-center gap-3 px-4 border-b border-border bg-card/80 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate({ to: "/chat" })}
          className="md:hidden h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-10 w-10 rounded-full bg-gradient-primary grid place-items-center text-sm font-semibold text-primary-foreground">
          {(data?.partner.username ?? "??").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-foreground">
            @{data?.partner.username ?? "…"}
          </div>
        </div>
        {data?.partner && (
          <VideoCallHeaderButton
            partnerId={data.partner.userId}
            partnerUsername={data.partner.username}
          />
        )}

      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {isLoading && (
          <div className="text-center text-muted-foreground text-sm">Carregando…</div>
        )}
        {data?.messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-16">
            Envie a primeira mensagem
          </div>
        )}
        {data?.messages.map((m) => {
          const mine = m.senderId === meId;
          const locked = !mine && m.priceCents && !m.unlocked;

          if (locked) {
            return (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[75%] rounded-2xl rounded-bl-md border border-primary/30 bg-white shadow-card p-4 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Lock className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Mensagem exclusiva
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground italic blur-[3px] select-none">
                    {"•".repeat(Math.min(60, Math.max(20, m.content.length)))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnlock(m.id, m.priceCents!)}
                    disabled={unlockingId === m.id}
                    className="w-full h-10 rounded-md bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-60"
                  >
                    {unlockingId === m.id
                      ? "Processando…"
                      : `Desbloquear por ${formatBRL(m.priceCents!)}`}
                  </button>
                  <div className="text-[10px] text-right text-muted-foreground">
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                  mine
                    ? "bg-gradient-primary text-primary-foreground rounded-br-md shadow-glow"
                    : "bg-card text-card-foreground border border-border rounded-bl-md shadow-card",
                )}
              >
                {m.metadata?.welcome && !mine && (
                  <div className="mb-1 text-[10px] uppercase tracking-wide font-semibold text-primary">
                    Boas-vindas{m.metadata.tag ? ` · ${m.metadata.tag}` : ""}
                  </div>
                )}
                {m.metadata?.storyReply && (
                  <div
                    className={cn(
                      "mb-2 flex items-stretch gap-2 rounded-lg overflow-hidden border-l-2 pl-2 py-1",
                      mine ? "border-primary-foreground/60 bg-black/10" : "border-primary/70 bg-primary/5",
                    )}
                  >
                    {m.metadata.storyReply.thumbUrl ? (
                      <img
                        src={m.metadata.storyReply.thumbUrl}
                        alt=""
                        className="h-14 w-10 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-10 rounded bg-black/20 shrink-0" />
                    )}
                    <div className="min-w-0 flex flex-col justify-center">
                      <div
                        className={cn(
                          "text-[10px] uppercase tracking-wide font-semibold",
                          mine ? "text-primary-foreground/80" : "text-primary",
                        )}
                      >
                        {mine ? "Você respondeu ao story" : "Respondeu ao seu story"}
                      </div>
                      {m.metadata.storyReply.caption && (
                        <div
                          className={cn(
                            "text-xs truncate mt-0.5",
                            mine ? "text-primary-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          {m.metadata.storyReply.caption}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {m.content && (
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                )}

                {m.metadata?.media && m.metadata.media.length > 0 && (
                  <div className="mt-2 grid gap-2 grid-cols-2">
                    {m.metadata.media.map((mm, idx) =>
                      mm.url ? (
                        mm.kind === "image" ? (
                          <img
                            key={idx}
                            src={mm.url}
                            alt=""
                            className="rounded-lg w-full object-cover max-h-64"
                          />
                        ) : mm.kind === "video" ? (
                          <video
                            key={idx}
                            src={mm.url}
                            controls
                            className="rounded-lg w-full max-h-64"
                          />
                        ) : (
                          <audio key={idx} src={mm.url} controls className="w-full col-span-2" />
                        )
                      ) : null,
                    )}
                  </div>
                )}
                {m.priceCents ? (
                  <div
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      mine
                        ? "bg-card/15 text-primary-foreground"
                        : "bg-emerald-500/15 text-emerald-500",
                    )}
                  >
                    <Lock className="h-2.5 w-2.5" />
                    {formatBRL(m.priceCents)} · {mine ? "Paga" : "Desbloqueada"}
                  </div>
                ) : null}
                <div
                  className={cn(
                    "text-[10px] mt-1 text-right",
                    mine ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-xl px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="max-w-3xl mx-auto space-y-2">
          {priceLabel ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 font-medium">
                <DollarSign className="h-3 w-3" />
                Mensagem paga · {priceLabel}
              </span>
              <button
                type="button"
                onClick={() => setPriceCents(null)}
                className="text-muted-foreground hover:text-foreground underline"
              >
                remover
              </button>
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                priceLabel
                  ? "Escreva a mensagem exclusiva…"
                  : "Escreva uma mensagem…"
              }
              rows={1}
              className="flex-1 min-h-[44px] max-h-40 resize-none focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || sendMutation.isPending}
              className="h-11 w-11 shrink-0 grid place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Enviar"
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>

          {isCreator ? (
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-1">
                <ComposerIcon
                  icon={DollarSign}
                  label="Definir valor da mensagem"
                  active={!!priceCents}
                  onClick={() => setPriceOpen(true)}
                />
              </div>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      <PriceDialog
        open={priceOpen}
        onOpenChange={setPriceOpen}
        initialCents={priceCents}
        onConfirm={(cents) => setPriceCents(cents)}
      />

      <PaymentMethodDialog
        open={!!pendingMsg}
        onOpenChange={(v) => !v && setPendingMsg(null)}
        title="Desbloquear mensagem"
        amountCents={pendingMsg?.priceCents ?? 0}
        loading={!!unlockingId}
        onConfirm={confirmUnlockPayment}
      />

      <PaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Desbloquear mensagem"
        checkout={checkout}
        onPaid={() => {
          queryClient.invalidateQueries({
            queryKey: ["chat", "messages", threadId],
          });
          toast.success("Mensagem desbloqueada");
        }}
      />
    </div>
  );
}
