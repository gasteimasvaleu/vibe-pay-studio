import { Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AudioLines,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Images,
  Layers,
  Lock,
  MessageCircle,
  MoreVertical,
  Trophy,
} from "lucide-react";
import {
  toggleLike,
  toggleBookmark,
  type FeedItem,
} from "@/lib/publications.functions";
import { PublicationOptionsSheet } from "./PublicationOptionsSheet";

function formatRelativeTime(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  return `${w}sem`;
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type FeedData = { items: FeedItem[]; nextCursor: string | null };

export function PublicationCard({
  item,
  onUnlock,
  onComment,
}: {
  item: FeedItem;
  onUnlock?: (item: FeedItem) => void;
  onComment?: (item: FeedItem) => void;
}) {
  const queryClient = useQueryClient();
  const likeFn = useServerFn(toggleLike);
  const bookmarkFn = useServerFn(toggleBookmark);

  const patchItem = (patch: Partial<FeedItem>) => {
    queryClient.setQueryData<FeedData>(["feed"], (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.id === item.id ? { ...it, ...patch } : it,
        ),
  };

  const [optionsOpen, setOptionsOpen] = useState(false);
    });
  };

  const likeMutation = useMutation({
    mutationFn: () => likeFn({ data: { publicationId: item.id } }),
    onMutate: () => {
      const wasLiked = item.liked_by_me;
      patchItem({
        liked_by_me: !wasLiked,
        like_count: Math.max(0, item.like_count + (wasLiked ? -1 : 1)),
      });
    },
    onSuccess: (res) => {
      patchItem({ liked_by_me: res.liked, like_count: res.likeCount });
    },
    onError: (e: unknown) => {
      patchItem({ liked_by_me: item.liked_by_me, like_count: item.like_count });
      toast.error(e instanceof Error ? e.message : "Erro ao curtir");
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => bookmarkFn({ data: { publicationId: item.id } }),
    onMutate: () => {
      patchItem({ saved_by_me: !item.saved_by_me });
    },
    onSuccess: (res) => {
      patchItem({ saved_by_me: res.saved });
      toast.success(res.saved ? "Post favoritado" : "Removido dos favoritos");
    },
    onError: (e: unknown) => {
      patchItem({ saved_by_me: item.saved_by_me });
      toast.error(e instanceof Error ? e.message : "Erro ao favoritar");
    },
  });

  return (
    <article className="rounded-3xl overflow-hidden border border-primary/30 bg-white/[0.04] backdrop-blur-md">
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="h-9 w-9 rounded-full bg-primary grid place-items-center text-sm font-bold text-white">
          {(item.author_username ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            to="/perfil/$username"
            params={{ username: item.author_username ?? "" }}
            className="text-sm font-semibold truncate text-black hover:underline"
          >
            @{item.author_username ?? "usuario"}
          </Link>
        </div>
        {item.pinned && (
          <span className="text-[10px] uppercase tracking-widest text-orange-300">
            fixado
          </span>
        )}
      </header>

      {!item.locked && item.audio_url && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 grid place-items-center text-primary">
              <AudioLines className="h-5 w-5" />
            </div>
            <audio
              src={item.audio_url}
              controls
              preload="metadata"
              className="w-full h-9"
            />
          </div>
        </div>
      )}

      {item.locked ? (
        <div className="relative aspect-[16/10] bg-black/40">
          <LockedOverlay item={item} onUnlock={onUnlock} />
        </div>
      ) : item.media.length > 0 ? (
        <MediaCarousel media={item.media} />
      ) : !item.audio_url ? (
        <div className="relative aspect-[16/10] bg-black/40 grid place-items-center text-white/50 text-sm">
          Sem mídia
        </div>
      ) : null}

      {!item.locked && (
        <>
          <div className="flex items-center gap-1 px-3 py-1.5 mt-1 border-t border-border/40">
            <button
              type="button"
              aria-label={item.liked_by_me ? "Descurtir" : "Curtir"}
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              className="h-10 w-10 grid place-items-center rounded-full hover:bg-foreground/10 transition-colors"
            >
              <Heart
                className={`h-6 w-6 ${item.liked_by_me ? "fill-red-500 text-red-500" : "text-foreground/80"}`}
                strokeWidth={1.75}
              />
            </button>
            <button
              type="button"
              aria-label="Comentar"
              onClick={() => onComment?.(item)}
              className="h-10 w-10 grid place-items-center rounded-full hover:bg-foreground/10 transition-colors text-foreground/80 hover:text-foreground"
            >
              <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label={item.saved_by_me ? "Remover dos salvos" : "Salvar"}
              onClick={() => bookmarkMutation.mutate()}
              disabled={bookmarkMutation.isPending}
              className="ml-auto h-10 w-10 grid place-items-center rounded-full hover:bg-foreground/10 transition-colors"
            >
              <Bookmark
                className={`h-6 w-6 ${item.saved_by_me ? "fill-primary text-primary" : "text-foreground/80"}`}
                strokeWidth={1.75}
              />
            </button>
          </div>

          {(item.like_count > 0 || item.comment_count > 0) && (
            <div className="px-4 pb-2 text-sm text-foreground flex items-center gap-4">
              {item.like_count > 0 && (
                <span>
                  <strong className="font-semibold">{item.like_count}</strong>{" "}
                  {item.like_count === 1 ? "curtida" : "curtidas"}
                </span>
              )}
              {item.comment_count > 0 && (
                <button
                  type="button"
                  onClick={() => onComment?.(item)}
                  className="text-muted-foreground hover:underline"
                >
                  Ver {item.comment_count === 1 ? "1 comentário" : `${item.comment_count} comentários`}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {item.caption && (
        <p className="px-4 py-2 pb-3 text-sm text-foreground/90 whitespace-pre-wrap">
          {item.caption}
        </p>
      )}
    </article>
  );
}


function MediaCarousel({ media }: { media: FeedItem["media"] }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = media.length;
  const current = media[index]!;

  const go = (dir: -1 | 1) => {
    setIndex((i) => Math.min(Math.max(i + dir, 0), total - 1));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  return (
    <div
      className="relative aspect-[16/10] bg-black overflow-hidden select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {current.type === "image" && (
        <img
          src={current.url}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
        />
      )}

      {current.type === "video" ? (
        <video
          key={current.id}
          src={current.url}
          controls
          className="relative w-full h-full object-contain"
        />
      ) : (
        <img
          key={current.id}
          src={current.url}
          alt=""
          className="relative w-full h-full object-contain"
        />
      )}

      {total > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => go(-1)}
              className="absolute left-1 top-1/2 -translate-y-1/2 h-12 w-12 grid place-items-center text-white/90 hover:text-white transition-colors drop-shadow-lg"
            >
              <ChevronLeft className="h-8 w-8" strokeWidth={1.5} />
            </button>
          )}
          {index < total - 1 && (
            <button
              type="button"
              aria-label="Próximo"
              onClick={() => go(1)}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-12 w-12 grid place-items-center text-white/90 hover:text-white transition-colors drop-shadow-lg"
            >
              <ChevronRight className="h-8 w-8" strokeWidth={1.5} />
            </button>
          )}

          <div className="absolute top-3 right-3 text-white/90 drop-shadow">
            <Layers className="h-5 w-5" />
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            <Images className="h-3.5 w-3.5" />
            {index + 1}/{total}
          </div>
        </>
      )}
    </div>
  );
}

function LockedOverlay({
  item,
  onUnlock,
}: {
  item: FeedItem;
  onUnlock?: (item: FeedItem) => void;
}) {
  const isChallenge = item.visibility === "challenge";
  const cents = isChallenge ? item.challenge_cents : item.price_cents;
  const label = isChallenge ? "Aceitar desafio" : "Desbloquear";
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-black/70 via-black/60 to-black/80">
      <div className="text-center px-6">
        <div className="mx-auto h-14 w-14 rounded-full bg-white/10 border border-white/20 grid place-items-center text-white">
          {isChallenge ? (
            <Trophy className="h-6 w-6" />
          ) : (
            <Lock className="h-6 w-6" />
          )}
        </div>
        <p className="mt-4 text-sm text-white/80">
          {isChallenge ? "Publicação de desafio" : "Publicação exclusiva"}
        </p>
        <button
          type="button"
          onClick={() => onUnlock?.(item)}
          className="mt-4 inline-flex items-center gap-2 px-6 h-11 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-pink-400 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:opacity-95"
        >
          {label} · {cents != null ? brl.format(cents / 100) : ""}
        </button>
      </div>
    </div>
  );
}
