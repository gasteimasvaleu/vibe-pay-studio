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
