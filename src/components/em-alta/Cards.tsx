import { BadgeCheck, Image as ImageIcon, Radio, Video } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type {
  ChatItem,
  CreatorBase,
  LiveItem,
  OfertaItem,
  RumoItem,
  UmAUmItem,
} from "@/lib/em-alta.mock";

function Verified() {
  return <BadgeCheck className="h-4 w-4 text-primary fill-primary/10 shrink-0" />;
}

function rankSuffix(rank: number) {
  return `${rank}º`;
}

export function TopCreatorCard({ item, rank }: { item: CreatorBase; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className="relative snap-start shrink-0 w-40 md:w-48 aspect-[3/4] rounded-2xl overflow-hidden bg-muted"
    >
      <img src={item.coverUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute top-2 left-3 text-4xl font-black text-white/90 drop-shadow leading-none">{rank}</span>
      <div className="absolute bottom-2 left-3 right-3 text-white">
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
      className="relative snap-start shrink-0 w-36 md:w-40 aspect-square rounded-2xl overflow-hidden bg-muted"
    >
      <img src={item.coverUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {item.discountLabel && (
        <span className="absolute top-2 right-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5">
          {item.discountLabel} OFF
        </span>
      )}
      <div className="absolute bottom-2 left-3 right-3 text-white">
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
      className="snap-start shrink-0 w-72 md:w-80 rounded-2xl overflow-hidden bg-card shadow-card border border-border"
    >
      <div className="relative h-28 bg-muted">
        <img src={item.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      </div>
      <div className="relative px-4 pt-6 pb-4">
        <img
          src={item.avatarUrl}
          alt={item.name}
          className="absolute -top-8 left-4 h-16 w-16 rounded-full border-4 border-card object-cover"
          loading="lazy"
        />
        <div className="pl-20">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm text-foreground truncate">{item.name}</span>
            {item.verified && <Verified />}
          </div>
          <p className="text-xs text-muted-foreground truncate">@{item.handle}</p>
        </div>
      </div>
    </Link>
  );
}

export function MimadaCard({ item, rank }: { item: CreatorBase; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className="relative snap-start shrink-0 w-32 md:w-36 aspect-[3/4] rounded-2xl overflow-hidden bg-muted"
    >
      <img src={item.coverUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="absolute top-2 right-2 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      <div className="absolute bottom-2 left-2 right-2 text-white">
        <div className="flex items-center gap-1">
          <span className="font-bold text-xs truncate">{item.name}</span>
          {item.verified && <BadgeCheck className="h-3 w-3 text-primary shrink-0" />}
        </div>
        <p className="text-[10px] text-white/80 truncate">@{item.handle}</p>
      </div>
    </Link>
  );
}

export function RumoAoTopoCard({ item, rank }: { item: RumoItem; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className="snap-start shrink-0 w-80 rounded-2xl overflow-hidden bg-card shadow-card border border-border"
    >
      <div className="relative h-24 bg-muted">
        <img src={item.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
        <div className="absolute bottom-2 right-3 flex items-center gap-3 text-white text-xs bg-black/40 rounded-full px-2 py-1">
          <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" />{item.photos}</span>
          <span className="flex items-center gap-1"><Video className="h-3 w-3" />{item.videos}</span>
        </div>
      </div>
      <div className="relative px-4 pt-6 pb-4">
        <img
          src={item.avatarUrl}
          alt={item.name}
          className="absolute -top-8 left-4 h-16 w-16 rounded-full border-4 border-card object-cover"
          loading="lazy"
        />
        <div className="pl-20">
          <p className="font-bold text-sm text-foreground truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate">@{item.handle}</p>
        </div>
      </div>
    </Link>
  );
}

export function PostEmAltaCard({ item, rank }: { item: CreatorBase; rank: number }) {
  return (
    <Link
      to="/perfil/$username"
      params={{ username: item.handle }}
      className="relative snap-start shrink-0 w-72 md:w-80 aspect-[16/10] rounded-2xl overflow-hidden bg-muted"
    >
      <img src={item.coverUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-white">
        <img src={item.avatarUrl} alt="" className="h-9 w-9 rounded-md border-2 border-white object-cover" loading="lazy" />
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
    <div className="snap-start shrink-0 w-80 rounded-2xl bg-card shadow-card border border-border p-3 flex items-center gap-3">
      <img src={item.avatarUrl} alt={item.name} className="h-12 w-12 rounded-full object-cover" loading="lazy" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-primary">{rankSuffix(rank)}</p>
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm text-foreground truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.statusLabel}</p>
      </div>
      <Link
        to="/perfil/$username"
        params={{ username: item.handle }}
        className="text-xs font-semibold text-primary border border-primary rounded-md px-3 py-1.5 hover:bg-primary/10 transition-colors"
      >
        Ver perfil
      </Link>
    </div>
  );
}

export function UmAUmCard({ item, rank }: { item: UmAUmItem; rank: number }) {
  return (
    <div className="snap-start shrink-0 w-64 rounded-2xl bg-card shadow-card border border-border overflow-hidden">
      <div className="relative aspect-[4/5] bg-muted">
        <img src={item.coverUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
        {item.discountLabel && (
          <span className="absolute top-2 left-2 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-1 leading-tight max-w-[60%]">
            {item.discountLabel}
          </span>
        )}
        <span className="absolute bottom-2 right-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1">
          um a um
        </span>
      </div>
      <div className="p-3 text-center space-y-2">
        <div className="flex items-center justify-center gap-1">
          <span className="font-bold text-sm text-foreground truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="text-xs text-muted-foreground truncate">@{item.handle}</p>
        <Link
          to="/perfil/$username"
          params={{ username: item.handle }}
          className="inline-block text-xs font-semibold text-primary border border-primary rounded-md px-4 py-1.5 hover:bg-primary/10 transition-colors"
        >
          Ver perfil
        </Link>
      </div>
    </div>
  );
}

export function LiveCard({ item, rank }: { item: LiveItem; rank: number }) {
  return (
    <div className="snap-start shrink-0 w-56 rounded-2xl bg-card shadow-card border border-border overflow-hidden">
      <div className="relative aspect-square bg-muted">
        <img src={item.coverUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <span className="absolute top-2 right-3 text-white font-bold drop-shadow">{rankSuffix(rank)}</span>
      </div>
      <div className="p-3 text-center space-y-2">
        <div className="flex items-center justify-center gap-1">
          <span className="font-bold text-sm text-foreground truncate">{item.name}</span>
          {item.verified && <Verified />}
        </div>
        <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Radio className="h-3 w-3 text-destructive" />
          {item.livesLast7Days} lives nos últimos 7 dias
        </p>
        <Link
          to="/perfil/$username"
          params={{ username: item.handle }}
          className="inline-block text-xs font-semibold text-primary border border-primary rounded-md px-4 py-1.5 hover:bg-primary/10 transition-colors"
        >
          Ver perfil
        </Link>
      </div>
    </div>
  );
}
