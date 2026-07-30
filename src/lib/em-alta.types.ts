export type CreatorBase = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  verified?: boolean;
};

export type OfertaItem = CreatorBase & { discountPct?: number | null };
export type RumoItem = CreatorBase & { photos: number; videos: number };
export type ChatItem = CreatorBase & { online?: boolean; messages7d?: number };
export type UmAUmItem = CreatorBase & { calls?: number };
export type LiveItem = CreatorBase & { isLive?: boolean; livesLast7Days: number };

export type EmAltaFeed = {
  topCreators: CreatorBase[];
  ofertas: OfertaItem[];
  perfisGratuitos: CreatorBase[];
  maisMimadas: CreatorBase[];
  rumoAoTopo: RumoItem[];
  emAltaNosPosts: CreatorBase[];
  bombandoNoChat: ChatItem[];
  chamadaUmAUm: UmAUmItem[];
  liveNasAlturas: LiveItem[];
};

export const emptyEmAltaFeed: EmAltaFeed = {
  topCreators: [],
  ofertas: [],
  perfisGratuitos: [],
  maisMimadas: [],
  rumoAoTopo: [],
  emAltaNosPosts: [],
  bombandoNoChat: [],
  chamadaUmAUm: [],
  liveNasAlturas: [],
};

export type EmAltaSectionSlug =
  | "top-creators"
  | "ofertas"
  | "perfis-gratuitos"
  | "mais-mimadas"
  | "rumo-ao-topo"
  | "posts"
  | "chat"
  | "um-a-um"
  | "lives";

export const EM_ALTA_SECTIONS: Record<
  EmAltaSectionSlug,
  { title: string; feedKey: keyof EmAltaFeed }
> = {
  "top-creators": { title: "Top creators", feedKey: "topCreators" },
  ofertas: { title: "Ofertas de assinatura", feedKey: "ofertas" },
  "perfis-gratuitos": { title: "Perfis gratuitos", feedKey: "perfisGratuitos" },
  "mais-mimadas": { title: "As mais mimadas", feedKey: "maisMimadas" },
  "rumo-ao-topo": { title: "Rumo ao topo", feedKey: "rumoAoTopo" },
  posts: { title: "Em alta nos posts", feedKey: "emAltaNosPosts" },
  chat: { title: "Bombando no chat", feedKey: "bombandoNoChat" },
  "um-a-um": { title: "Chamada Um a Um", feedKey: "chamadaUmAUm" },
  lives: { title: "Live nas alturas", feedKey: "liveNasAlturas" },
};

export function isEmAltaSectionSlug(v: string): v is EmAltaSectionSlug {
  return Object.prototype.hasOwnProperty.call(EM_ALTA_SECTIONS, v);
}
