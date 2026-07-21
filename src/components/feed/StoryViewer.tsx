import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { openOverlay, closeOverlay } from "@/hooks/useFullscreenOverlay";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Lock, Trash2, Loader2, Eye, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  getCreatorStories,
  markStoryViewed,
  deleteStory,
  type StoryItem,
} from "@/lib/stories.functions";
import { sendStoryReply } from "@/lib/chat.functions";
import { payWithWallet } from "@/lib/wallet-pay.functions";
import { createStoryUnlockPayment } from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";
import { translatePaymentError } from "@/lib/payment-limits";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";
import { PaymentModal, type CheckoutData, type PaymentMethod } from "@/components/payments/PaymentModal";



export function StoryViewer({
  creatorId,
  open,
  onOpenChange,
  onChanged,
}: {
  creatorId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchStories = useServerFn(getCreatorStories);
  const markViewed = useServerFn(markStoryViewed);
  const walletPay = useServerFn(payWithWallet);
  const removeStory = useServerFn(deleteStory);
  const replyToStory = useServerFn(sendStoryReply);

  const [index, setIndex] = useState(0);
  const [unlocking, setUnlocking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const progressRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const storiesQuery = useQuery({
    queryKey: ["creator-stories", creatorId],
    queryFn: () => fetchStories({ data: { creatorId: creatorId as string } }),
    enabled: !!creatorId && open,
  });


  const stories = storiesQuery.data ?? [];
  const current: StoryItem | undefined = stories[index];

  useEffect(() => {
    if (open) setIndex(0);
  }, [open, creatorId]);

  useEffect(() => {
    if (!open) return;
    openOverlay();
    return () => closeOverlay();
  }, [open]);



  const advance = () => {
    if (index < stories.length - 1) setIndex((i) => i + 1);
    else onOpenChange(false);
  };
  const back = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  // Mark viewed + progress bar for unlocked stories
  useEffect(() => {
    if (!open || !current) return;
    if (current.unlocked) {
      void markViewed({ data: { storyId: current.id } }).catch(() => {});
    }
    progressRef.current = 0;
    const el = document.getElementById(`story-progress-${index}`);
    if (!el) return;
    if (!current.unlocked) {
      el.style.width = "0%";
      return;
    }
    const isVideo = current.media_type === "video";
    if (isVideo) return; // video advances on ended
    if (replyText.length > 0 || sendingReply) return; // pause while composing reply
    const duration = 5000;
    const start = performance.now();
    const tick = (t: number) => {
      const pct = Math.min(100, ((t - start) / duration) * 100);
      el.style.width = `${pct}%`;
      if (pct >= 100) {
        advance();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, open, current?.id, current?.unlocked, replyText.length === 0, sendingReply]);

  // Reset composer when moving to next story
  useEffect(() => {
    setReplyText("");
  }, [index, creatorId]);

  const handleSendReply = async () => {
    if (!current || sendingReply) return;
    const content = replyText.trim();
    if (!content) return;
    setSendingReply(true);
    try {
      const res = await replyToStory({ data: { storyId: current.id, content } });
      toast.success("Resposta enviada");
      setReplyText("");
      onOpenChange(false);
      navigate({ to: "/chat/$threadId", params: { threadId: res.threadId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar resposta");
    } finally {
      setSendingReply(false);
    }
  };


  const handleUnlock = async () => {
    if (!current || unlocking) return;
    setUnlocking(true);
    try {
      await walletPay({ data: { kind: "story_unlock", storyId: current.id } });
      toast.success("Story desbloqueado!");
      await qc.invalidateQueries({ queryKey: ["creator-stories", creatorId] });
      await qc.invalidateQueries({ queryKey: ["subscriber-wallet"] });
      onChanged();
    } catch (e: any) {
      toast.error(translatePaymentError(e, "Falha ao desbloquear"));
    } finally {
      setUnlocking(false);
    }
  };

  const handleDelete = async () => {
    if (!current || deleting) return;
    if (!confirm("Apagar este story?")) return;
    setDeleting(true);
    try {
      await removeStory({ data: { id: current.id } });
      toast.success("Story apagado");
      await qc.invalidateQueries({ queryKey: ["creator-stories", creatorId] });
      onChanged();
      if (stories.length <= 1) onOpenChange(false);
      else setIndex((i) => Math.max(0, i - 1));
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao apagar");
    } finally {
      setDeleting(false);
    }
  };

  if (!open || !creatorId) return null;

  const creatorUsername = current?.creator_username ?? "";
  const creatorAvatarUrl = current?.creator_avatar_url ?? null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
      <div className="relative flex flex-col w-full h-full md:h-[min(92vh,900px)] md:w-[min(92vw,calc(92vh*9/16))] md:aspect-[9/16] md:rounded-2xl md:overflow-hidden md:shadow-2xl bg-black">
        {/* Progress bars */}
        <div className="absolute top-0 inset-x-0 z-20 flex gap-1.5 px-3 pt-3">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden">
              <div
                id={`story-progress-${i}`}
                className="h-full bg-white"
                style={{ width: i < index ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 inset-x-0 z-20 flex items-center justify-between px-3 pt-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-white/10 overflow-hidden shrink-0 grid place-items-center">
              {creatorAvatarUrl ? (
                <img src={creatorAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-white/70 text-xs font-semibold">
                  {creatorUsername.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold truncate">@{creatorUsername}</div>
              <div className="text-white/60 text-[11px] leading-tight truncate">
                {current ? new Date(current.published_at).toLocaleString("pt-BR") : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {current?.is_self && (
              <>
                <div
                  className="h-9 px-3 grid place-items-center rounded-full bg-white/10 text-white text-xs font-semibold"
                  aria-label="Visualizações"
                  title="Visualizações"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    {current.view_count}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-9 w-9 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  aria-label="Apagar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

        </div>

        {/* Content */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {storiesQuery.isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          ) : !current ? (
            <div className="text-white/80 text-sm">Nenhum story disponível.</div>
          ) : current.unlocked && current.media_url ? (
            current.media_type === "video" ? (
              <video
                key={current.id}
                src={current.media_url}
                className="h-full w-full object-cover"
                autoPlay
                playsInline
                onEnded={advance}
                controls={false}
              />
            ) : (
              <img
                key={current.id}
                src={current.media_url}
                alt=""
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <LockedOverlay
              thumbUrl={current.thumb_url}
              priceCents={current.price_cents}
              unlocking={unlocking}
              onUnlock={handleUnlock}
            />
          )}

          {/* Tap zones */}
          <button
            type="button"
            className="absolute inset-y-0 left-0 w-1/3 z-10"
            onClick={back}
            aria-label="Anterior"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 w-1/3 z-10"
            onClick={advance}
            aria-label="Próximo"
          />
        </div>

        {/* Caption + reply / subscribe CTA */}
        {current && (current.caption || (!current.is_self && current.unlocked)) && (
          <div className="absolute bottom-0 inset-x-0 z-20 px-4 pt-6 pb-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent space-y-3">
            {current.caption && (
              <div className="text-white text-sm">{current.caption}</div>
            )}
            {!current.is_self && current.unlocked && current.viewer_is_subscriber && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendReply();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Responder para @${creatorUsername}…`}
                  maxLength={4000}
                  disabled={sendingReply}
                  className="flex-1 h-11 rounded-full bg-white/10 text-white placeholder:text-white/50 px-4 text-sm border border-white/20 focus:outline-none focus:border-white/60 focus:bg-white/15"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="h-11 w-11 grid place-items-center rounded-full bg-white text-black disabled:opacity-40"
                  aria-label="Enviar resposta"
                >
                  {sendingReply ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendHorizontal className="h-5 w-5" />
                  )}
                </button>
              </form>
            )}
            {!current.is_self && current.unlocked && !current.viewer_is_subscriber && (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  navigate({ to: "/perfil/$username", params: { username: creatorUsername } });
                }}
                className="w-full h-11 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Assine @{creatorUsername} para enviar mensagem
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function LockedOverlay({
  thumbUrl,
  priceCents,
  unlocking,
  onUnlock,
}: {
  thumbUrl: string | null;
  priceCents: number;
  unlocking: boolean;
  onUnlock: () => void;
}) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {thumbUrl && (
        <img
          src={thumbUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-40"
        />
      )}
      <div className="relative z-10 flex flex-col items-center gap-4 p-8 rounded-3xl bg-black/50 border border-white/10 backdrop-blur">
        <div className="h-14 w-14 rounded-full bg-white/10 grid place-items-center">
          <Lock className="h-6 w-6 text-white" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold">Story exclusivo</p>
          <p className="text-white/70 text-sm mt-1">
            Desbloqueie por R$ {(priceCents / 100).toFixed(2).replace(".", ",")}
          </p>
        </div>
        <Button onClick={onUnlock} disabled={unlocking} className="min-w-[180px]">
          {unlocking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Desbloqueando...
            </>
          ) : (
            "Desbloquear com carteira"
          )}
        </Button>
      </div>
    </div>
  );
}
