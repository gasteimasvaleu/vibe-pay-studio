import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Gift, Lock, Phone, Timer, Upload, Video, X } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getThreadWithPartner,
  markThreadRead,
  sendMessage,
  type ChatMessage,
} from "@/lib/chat.functions";
import {
  createCallInvite,
  cancelCallInvite,
  createPaidDmRequest,
  cancelPaidDmRequest,
  sendTipMessage,
  expireStaleInvites,
  markPaidDmDelivered,
} from "@/lib/chat-monetization.functions";
import { createChatUnlockPayment, createVideoCallPayment, createPaidDmPayment } from "@/lib/payments.functions";
import { payWithWallet } from "@/lib/wallet-pay.functions";
import { translatePaymentError } from "@/lib/payment-limits";
import { ChatComposer, type ComposerSendPayload } from "@/components/chat/ChatComposer";
import { FloatingEmojiLayer, type FloatingEmoji } from "@/components/chat/FloatingEmojiLayer";
import { BroadcastDialog } from "@/components/chat/BroadcastDialog";
import { PaymentModal, type CheckoutData, type PaymentMethod } from "@/components/payments/PaymentModal";
import { PaymentMethodDialog } from "@/components/payments/PaymentMethodDialog";
import { cn } from "@/lib/utils";
import { VideoCallHeaderButton } from "@/components/chat/VideoCallHeaderButton";
import { ThreadActionsMenu } from "@/components/chat/ThreadActionsMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


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

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date();
}

function CallInviteCard({
  invite,
  mine,
  onPay,
  onCancel,
}: {
  invite: Required<NonNullable<ChatMessage["metadata"]>>["callInvite"];
  mine: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  const expired = isExpired(invite.expiresAt) || invite.status === "expired";
  const paid = invite.status === "paid";
  const cancelled = invite.status === "cancelled";
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2 min-w-[220px]">
      <div className="flex items-center gap-2 text-primary">
        <Video className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Videochamada</span>
      </div>
      <div className="text-sm">
        {invite.durationMin} min · {formatBRL(invite.priceCents)}
      </div>
      {expired ? (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Timer className="h-3 w-3" /> Expirado
        </div>
      ) : cancelled ? (
        <div className="text-xs text-muted-foreground">Cancelado</div>
      ) : paid ? (
        <div className="text-xs text-emerald-500 font-medium flex items-center gap-1">
          <Phone className="h-3 w-3" /> Pago · aguardando início
        </div>
      ) : mine ? (
        <Button size="sm" variant="outline" className="w-full h-8" onClick={onCancel}>
          Cancelar convite
        </Button>
      ) : (
        <Button size="sm" className="w-full h-8 bg-gradient-primary" onClick={onPay}>
          Pagar {formatBRL(invite.priceCents)}
        </Button>
      )}
    </div>
  );
}

function TipCard({
  tip,
  mine,
}: {
  tip: Required<NonNullable<ChatMessage["metadata"]>>["tip"];
  mine: boolean;
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
      <div className="flex items-center gap-2 text-amber-500">
        <Gift className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Mimo</span>
      </div>
      <div className="text-sm font-medium">{formatBRL(tip.amountCents)}</div>
      <div className="text-[10px] text-muted-foreground">{mine ? "Você enviou um mimo" : "Enviou um mimo"}</div>
    </div>
  );
}

function PaidDmCard({
  upload,
  media,
  mine,
}: {
  upload: Required<NonNullable<ChatMessage["metadata"]>>["paidUpload"];
  media: { url?: string | null; kind: string; mime: string }[];
  mine: boolean;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-primary">
        <Lock className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Mídia paga</span>
      </div>
      <div className="text-sm">{formatBRL(upload.priceCents)} · {mine ? "enviada" : "recebida"}</div>
      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {media.map((m, idx) =>
            m.url ? (
              m.kind === "image" ? (
                <img key={idx} src={m.url} alt="" className="rounded-lg w-full object-cover max-h-48" />
              ) : m.kind === "video" ? (
                <video key={idx} src={m.url} controls className="rounded-lg w-full max-h-48" />
              ) : null
            ) : null,
          )}
        </div>
      )}
    </div>
  );
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
  const callInviteFn = useServerFn(createCallInvite);
  const cancelCallInviteFn = useServerFn(cancelCallInvite);
  const paidDmRequestFn = useServerFn(createPaidDmRequest);
  const cancelPaidDmRequestFn = useServerFn(cancelPaidDmRequest);
  const sendTipFn = useServerFn(sendTipMessage);
  const expireInvitesFn = useServerFn(expireStaleInvites);
  const videoCallPayFn = useServerFn(createVideoCallPayment);
  const paidDmPayFn = useServerFn(createPaidDmPayment);
  const deliverPaidDmFn = useServerFn(markPaidDmDelivered);

  const [meId, setMeId] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<{ id: string; priceCents: number } | null>(null);
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Monetization dialogs
  const [callInviteOpen, setCallInviteOpen] = useState(false);
  const [callPrice, setCallPrice] = useState<number>(3990);
  const [callDuration, setCallDuration] = useState<number>(15);
  const [paidDmOpen, setPaidDmOpen] = useState(false);
  const [paidDmPrice, setPaidDmPrice] = useState<number>(1490);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(1000);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [deliveringPaidDm, setDeliveringPaidDm] = useState<{ requestId: string } | null>(null);
  const [lastPaidDmRequestId, setLastPaidDmRequestId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    { type: "call" | "paidDm"; id: string; priceCents: number } | null
  >(null);

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
      .on("broadcast", { event: "float-emoji" }, ({ payload }) => {
        const emoji = (payload as { emoji?: string })?.emoji;
        if (!emoji) return;
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const x = (Math.random() - 0.5) * 200;
        setFloaters((prev) => [...prev, { id, emoji, x }]);
        setTimeout(() => setFloaters((prev) => prev.filter((f) => f.id !== id)), 2800);
      })
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

  useEffect(() => {
    if (!threadId) return;
    expireInvitesFn({ data: { threadId } }).catch(() => {});
  }, [threadId, expireInvitesFn]);

  const sendMutation = useMutation({
    mutationFn: (vars: ComposerSendPayload) =>
      sendFn({
        data: {
          threadId,
          content: vars.text,
          priceCents: vars.priceCents ?? 0,
          media: vars.media,
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

  const emitFloater = (emoji: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const x = (Math.random() - 0.5) * 200;
    setFloaters((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloaters((prev) => prev.filter((f) => f.id !== id)), 2800);
  };

  const callInviteMutation = useMutation({
    mutationFn: (vars: { priceCents: number; durationMinutes: number }) =>
      callInviteFn({ data: { threadId, priceCents: vars.priceCents, durationMinutes: vars.durationMinutes } }),
    onSuccess: () => {
      setCallInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", threadId] });
      toast.success("Convite de videochamada enviado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const paidDmMutation = useMutation({
    mutationFn: (vars: { priceCents: number }) =>
      paidDmRequestFn({ data: { threadId, priceCents: vars.priceCents } }),
    onSuccess: (res) => {
      setPaidDmOpen(false);
      setPendingAction({ type: "paidDm", id: res.requestId, priceCents: paidDmPrice });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const tipMutation = useMutation({
    mutationFn: (vars: { amountCents: number }) =>
      sendTipFn({ data: { threadId, amountCents: vars.amountCents } }),
    onSuccess: () => {
      setTipOpen(false);
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", threadId] });
      queryClient.invalidateQueries({ queryKey: ["subscriber-wallet"] });
      toast.success("Mimo enviado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const confirmActionPayment = async (method: PaymentMethod) => {
    if (!pendingAction) return;
    try {
      setUnlockingId(pendingAction.id);
      if (method === "WALLET") {
        if (pendingAction.type === "call") {
          await walletPay({ data: { kind: "video_call", callId: pendingAction.id } });
        } else {
          await walletPay({ data: { kind: "paid_dm", requestId: pendingAction.id } });
          setDeliveringPaidDm({ requestId: pendingAction.id });
        }
        setPendingAction(null);
        queryClient.invalidateQueries({ queryKey: ["chat", "messages", threadId] });
        queryClient.invalidateQueries({ queryKey: ["subscriber-wallet"] });
        toast.success("Pagamento confirmado");
        return;
      }
      const res =
        pendingAction.type === "call"
          ? await videoCallPayFn({ data: { callId: pendingAction.id, method } })
          : await paidDmPayFn({ data: { requestId: pendingAction.id, method } });
      if (pendingAction.type === "paidDm") {
        setLastPaidDmRequestId(pendingAction.id);
      }
      setPendingAction(null);
      setCheckout({
        paymentIntentId: res.paymentIntentId,
        method,
        pixQrCode: res.pixQrCode,
        pixCopyPaste: res.pixCopyPaste,
        invoiceUrl: res.invoiceUrl,
      });
      setModalOpen(true);
    } catch (err: any) {
      toast.error(translatePaymentError(err, "Erro ao gerar pagamento"));
    } finally {
      setUnlockingId(null);
    }
  };

  function openPaymentForCallInvite(messageId: string, callId: string, priceCents: number) {
    setPendingAction({ type: "call", id: callId, priceCents });
  }

  function openPaymentForPaidDm(messageId: string, requestId: string, priceCents: number) {
    setPendingAction({ type: "paidDm", id: requestId, priceCents });
  }


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
        {data?.partner.avatarUrl ? (
          <img
            src={data.partner.avatarUrl}
            alt={data.partner.username}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-primary grid place-items-center text-sm font-semibold text-primary-foreground">
            {(data?.partner.username ?? "??").slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-foreground">
            @{data?.partner.username ?? "…"}
          </div>
        </div>
        {data?.partner && (
          <div className="flex items-center gap-1">
            <VideoCallHeaderButton
              partnerId={data.partner.userId}
              partnerUsername={data.partner.username}
            />
            <ThreadActionsMenu
              threadId={threadId}
              partnerId={data.partner.userId}
              partnerUsername={data.partner.username}
            />
          </div>
        )}

      </header>

      <div className="relative flex-1 min-h-0">
        <FloatingEmojiLayer items={floaters} />
        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto px-4 py-6 space-y-3">
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
                {m.metadata?.callInvite && (
                  <CallInviteCard
                    invite={m.metadata.callInvite}
                    mine={mine}
                    onPay={() =>
                      openPaymentForCallInvite(m.id, m.metadata!.callInvite!.callId, m.metadata!.callInvite!.priceCents)
                    }
                    onCancel={() =>
                      cancelCallInviteFn({ data: { callId: m.metadata!.callInvite!.callId } }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ["chat", "messages", threadId] });
                        toast.success("Convite cancelado");
                      })
                    }
                  />
                )}
                {m.metadata?.tip && (
                  <TipCard tip={m.metadata.tip} mine={mine} />
                )}
                {m.metadata?.paidUpload && (
                  <PaidDmCard
                    upload={m.metadata.paidUpload}
                    media={m.metadata.media ?? []}
                    mine={mine}
                  />
                )}

                {m.content && !m.metadata?.callInvite && !m.metadata?.tip && (
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                )}

                {m.metadata?.media && m.metadata.media.length > 0 && (!m.metadata?.paidUpload || m.metadata.paidUpload.priceCents === 0) && (
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

      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-xl px-3 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="max-w-3xl mx-auto">
          <TooltipProvider delayDuration={200}>
            <ChatComposer
              meId={meId}
              isCreator={isCreator}
              isSubscriber={!isCreator}
              disabled={sendMutation.isPending}
              onSend={async (payload) => {
                await sendMutation.mutateAsync(payload);
              }}
              onFloatEmoji={(emoji) => {
                emitFloater(emoji);
                supabase
                  .channel(`chat-thread-${threadId}`)
                  .send({ type: "broadcast", event: "float-emoji", payload: { emoji } });
              }}
              onCallInvite={() => setCallInviteOpen(true)}
              onPaidDmRequest={() => setPaidDmOpen(true)}
              onTip={() => setTipOpen(true)}
              onBroadcast={() => setBroadcastOpen(true)}
            />
          </TooltipProvider>
        </div>
      </div>


      <PaymentMethodDialog
        open={!!pendingMsg}
        onOpenChange={(v) => !v && setPendingMsg(null)}
        title="Desbloquear mensagem"
        amountCents={pendingMsg?.priceCents ?? 0}
        loading={!!unlockingId}
        onConfirm={confirmUnlockPayment}
      />

      <PaymentMethodDialog
        open={!!pendingAction}
        onOpenChange={(v) => !v && setPendingAction(null)}
        title={pendingAction?.type === "call" ? "Pagar videochamada" : "Pagar envio de mídia"}
        amountCents={pendingAction?.priceCents ?? 0}
        loading={!!unlockingId}
        onConfirm={confirmActionPayment}
      />

      <PaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={pendingAction?.type === "call" ? "Pagar videochamada" : pendingAction?.type === "paidDm" ? "Pagar envio de mídia" : "Desbloquear mensagem"}
        checkout={checkout}
        onPaid={() => {
          queryClient.invalidateQueries({
            queryKey: ["chat", "messages", threadId],
          });
          toast.success("Pagamento confirmado");
          if (lastPaidDmRequestId) {
            setDeliveringPaidDm({ requestId: lastPaidDmRequestId });
            setLastPaidDmRequestId(null);
          }
        }}
      />

      {/* Call invite dialog */}
      <Dialog open={callInviteOpen} onOpenChange={setCallInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Convite de videochamada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Duração (min)</label>
              <Input
                type="number"
                min={5}
                max={120}
                value={callDuration}
                onChange={(e) => setCallDuration(Math.max(5, Math.min(120, Number(e.target.value))))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input
                type="number"
                min={39.9}
                max={5000}
                step={0.01}
                value={(callPrice / 100).toFixed(2)}
                onChange={(e) => setCallPrice(Math.round(Number(e.target.value) * 100))}
              />
            </div>
            <Button
              className="w-full bg-gradient-primary"
              disabled={callInviteMutation.isPending}
              onClick={() => callInviteMutation.mutate({ priceCents: callPrice, durationMinutes: callDuration })}
            >
              Enviar convite · válido por 10 min
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paid DM dialog */}
      <Dialog open={paidDmOpen} onOpenChange={setPaidDmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pagar para enviar mídia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              O criador cobra para receber mídias nesta conversa. Após o pagamento você poderá enviar fotos e vídeos.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Valor oferecido (R$)</label>
              <Input
                type="number"
                min={14.9}
                max={2000}
                step={0.01}
                value={(paidDmPrice / 100).toFixed(2)}
                onChange={(e) => setPaidDmPrice(Math.round(Number(e.target.value) * 100))}
              />
            </div>
            <Button
              className="w-full bg-gradient-primary"
              disabled={paidDmMutation.isPending}
              onClick={() => paidDmMutation.mutate({ priceCents: paidDmPrice })}
            >
              Continuar para pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tip dialog */}
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar mimo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input
                type="number"
                min={5}
                max={2000}
                step={0.01}
                value={(tipAmount / 100).toFixed(2)}
                onChange={(e) => setTipAmount(Math.round(Number(e.target.value) * 100))}
              />
            </div>
            <Button
              className="w-full bg-gradient-primary"
              disabled={tipMutation.isPending}
              onClick={() => tipMutation.mutate({ amountCents: tipAmount })}
            >
              Enviar mimo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BroadcastDialog
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        creatorId={meId ?? ""}
      />

      {/* Paid DM delivery dialog */}
      <PaidDmDeliveryDialog
        open={!!deliveringPaidDm}
        onClose={() => setDeliveringPaidDm(null)}
        requestId={deliveringPaidDm?.requestId ?? ""}
        threadId={threadId}
        onDelivered={() => {
          setDeliveringPaidDm(null);
          queryClient.invalidateQueries({ queryKey: ["chat", "messages", threadId] });
        }}
      />
    </div>
  );
}

function PaidDmDeliveryDialog({
  open,
  onClose,
  requestId,
  threadId,
  onDelivered,
}: {
  open: boolean;
  onClose: () => void;
  requestId: string;
  threadId: string;
  onDelivered: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const deliverFn = useServerFn(markPaidDmDelivered);

  const handleUpload = async () => {
    if (!requestId || files.length === 0) return;
    setUploading(true);
    try {
      const media: { path: string; kind: "image" | "video"; mime: string }[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "";
        const path = `${threadId}/${requestId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("chat-paid-uploads").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;
        const kind = file.type.startsWith("video/") ? "video" : "image";
        media.push({ path, kind, mime: file.type });
      }
      await deliverFn({ data: { requestId, media } });
      toast.success("Mídia enviada");
      onDelivered();
      setFiles([]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mídia");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Enviar mídia paga</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Selecione fotos ou vídeos para enviar ao criador.
          </p>
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 cursor-pointer hover:bg-accent transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Clique para selecionar arquivos</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {files.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {files.length} arquivo{files.length > 1 ? "s" : ""} selecionado{files.length > 1 ? "s" : ""}
            </div>
          )}
          <Button
            className="w-full bg-gradient-primary"
            disabled={files.length === 0 || uploading}
            onClick={handleUpload}
          >
            {uploading ? "Enviando…" : "Enviar mídia"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
