import { BadgeCheck, Image as ImageIcon, Radio, Video } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type {
  ChatItem,
  CreatorBase,
  LiveItem,
  OfertaItem,
  RumoItem,
  UmAUmItem,
} from "@/lib/em-alta.types";

function Verified() {
  return <BadgeCheck className="h-4 w-4 text-primary fill-primary/10 shrink-0" />;
}

function rankSuffix(rank: number) {
  return `${rank}º`;
}

const CARD_W = "snap-start shrink-0 w-72 md:w-80";

export function TopCreatorCard({ item, rank }: { item: CreatorBase; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className={`relative ${CARD_W} aspect-[16/10] rounded-2xl overflow-hidden bg-muted`}
    >
      <img src={item.avatarUrl ?? item.coverUrl ?? undefined} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      <div className="absolute bottom-3 left-3 right-3 text-white">
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="text-xs text-white/80 truncate">@{item.handle}</p>
      </div>
    </Link>
  );
}

export function OfertaCard({ item }: { item: OfertaItem }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className={`relative ${CARD_W} aspect-[16/10] rounded-2xl overflow-hidden bg-muted`}
    >
      <img src={item.avatarUrl ?? item.coverUrl ?? undefined} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {item.discountPct != null && item.discountPct > 0 && (
        <span className="absolute top-2 right-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5">
          {Math.round(item.discountPct)}% OFF
        </span>
      )}

      <div className="absolute bottom-3 left-3 right-3 text-white">
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="text-xs text-white/80 truncate">@{item.handle}</p>
      </div>
    </Link>
  );
}

export function PerfilGratuitoCard({ item, rank }: { item: CreatorBase; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className={`relative ${CARD_W} aspect-[16/10] rounded-2xl overflow-hidden bg-muted`}
    >
      <img src={item.avatarUrl ?? item.coverUrl ?? undefined} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      <div className="absolute bottom-3 left-3 right-3 text-white">
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="text-xs text-white/80 truncate">@{item.handle}</p>
      </div>
    </Link>
  );
}

export function MimadaCard({ item, rank }: { item: CreatorBase; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className={`relative ${CARD_W} aspect-[16/10] rounded-2xl overflow-hidden bg-muted`}
    >
      <img src={item.avatarUrl ?? item.coverUrl ?? undefined} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      <div className="absolute bottom-3 left-3 right-3 text-white">
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="text-xs text-white/80 truncate">@{item.handle}</p>
      </div>
    </Link>
  );
}

export function RumoAoTopoCard({ item, rank }: { item: RumoItem; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className={`relative ${CARD_W} aspect-[16/10] rounded-2xl overflow-hidden bg-muted`}
    >
      <img src={item.avatarUrl ?? item.coverUrl ?? undefined} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      <div className="absolute top-2 left-2 flex items-center gap-3 text-white text-[10px] bg-black/40 rounded-full px-2 py-1">
        <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" />{item.photos}</span>
        <span className="flex items-center gap-1"><Video className="h-3 w-3" />{item.videos}</span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 text-white">
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="text-xs text-white/80 truncate">@{item.handle}</p>
      </div>
    </Link>
  );
}

export function PostEmAltaCard({ item, rank }: { item: CreatorBase; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className={`relative ${CARD_W} aspect-[16/10] rounded-2xl overflow-hidden bg-muted`}
    >
      <img src={item.coverUrl ?? undefined} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-white">
        <img src={item.avatarUrl ?? undefined} alt="" className="h-9 w-9 rounded-full border-2 border-white object-cover" loading="lazy" />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm truncate">{item.name}</span>
            {item.verified && <Verified />}
          </div>
          <p className="text-xs text-white/80 truncate">@{item.handle}</p>
        </div>
      </div>
    </Link>
  );
}

export function ChatBombandoCard({ item, rank }: { item: ChatItem; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className={`relative ${CARD_W} aspect-[16/10] rounded-2xl overflow-hidden bg-muted`}
    >
      <img src={item.avatarUrl ?? item.coverUrl ?? undefined} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      {item.online && (
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/50 text-white text-[10px] font-bold px-2 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
        </span>
      )}
      <div className="absolute bottom-3 left-3 right-3 text-white">
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="text-xs text-white/80 truncate">
          {item.online ? "Responde em instantes" : `${item.messages7d ?? 0} mensagens nos últimos 7 dias`}
        </p>
      </div>
    </Link>
  );
}

export function UmAUmCard({ item, rank }: { item: UmAUmItem; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className={`relative ${CARD_W} aspect-[16/10] rounded-2xl overflow-hidden bg-muted`}
    >
      <img src={item.avatarUrl ?? item.coverUrl ?? undefined} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      <span className="absolute top-2 left-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1">
        {item.calls != null && item.calls > 0
          ? `${item.calls} ${item.calls === 1 ? "chamada" : "chamadas"}`
          : "um a um"}
      </span>
      <div className="absolute bottom-3 left-3 right-3 text-white">
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="text-xs text-white/80 truncate">@{item.handle}</p>
      </div>
    </Link>
  );
}

export function LiveCard({ item, rank }: { item: LiveItem; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className={`relative ${CARD_W} aspect-[16/10] rounded-2xl overflow-hidden bg-muted`}
    >
      <img src={item.avatarUrl ?? item.coverUrl ?? undefined} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      {item.isLive && (
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-1">
          <Radio className="h-3 w-3" /> AO VIVO
        </span>
      )}
      <div className="absolute bottom-3 left-3 right-3 text-white">
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="flex items-center gap-1 text-xs text-white/80 truncate">
          <Radio className="h-3 w-3" />
          {item.livesLast7Days} {item.livesLast7Days === 1 ? "live" : "lives"} nos últimos 7 dias
        </p>
      </div>
    </Link>
  );
}
