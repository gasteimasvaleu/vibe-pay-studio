import { Link } from "@tanstack/react-router";
import { AudioLines, Lock, Trophy } from "lucide-react";
import type { FeedItem } from "@/lib/publications.functions";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function PublicationCard({
  item,
  onUnlock,
}: {
  item: FeedItem;
  onUnlock?: (item: FeedItem) => void;
}) {
  const first = item.media[0];

  return (
    <article className="rounded-3xl overflow-hidden border border-white/10 bg-white/[0.04] backdrop-blur-md">
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 grid place-items-center text-sm font-bold text-white">
          {(item.author_username ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            to="/perfil/$username"
            params={{ username: item.author_username ?? "" }}
            className="text-sm font-semibold truncate hover:underline"
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

      {item.locked ? (
        <div className="relative aspect-[4/5] bg-black/40">
          <LockedOverlay item={item} onUnlock={onUnlock} />
        </div>
      ) : first ? (
        <div className="relative aspect-[4/5] bg-black/40">
          {first.type === "video" ? (
            <video
              src={first.url}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={first.url}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
      ) : item.audio_url ? null : (
        <div className="relative aspect-[4/5] bg-black/40 grid place-items-center text-white/50 text-sm">
          Sem mídia
        </div>
      )}

      {!item.locked && item.audio_url && (
        <div className="px-4 pt-4">
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

      {item.caption && (
        <p className="px-4 py-3 text-sm text-white/90 whitespace-pre-wrap">
          {item.caption}
        </p>
      )}
    </article>
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
