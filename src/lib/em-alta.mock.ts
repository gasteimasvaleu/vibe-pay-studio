export type CreatorBase = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  coverUrl: string;
  verified?: boolean;
};

const cover = (seed: string) => `https://picsum.photos/seed/${seed}/600/800`;
const wideCover = (seed: string) => `https://picsum.photos/seed/${seed}/800/450`;
const avatar = (seed: string) => `https://i.pravatar.cc/160?u=${seed}`;

export const topCreators: CreatorBase[] = [
  { id: "1", name: "OLÍVIA BIANCHI", handle: "Oliviabianchivip", avatarUrl: avatar("olivia"), coverUrl: cover("olivia"), verified: true },
  { id: "2", name: "Maju Garcia", handle: "majugarcia", avatarUrl: avatar("maju"), coverUrl: cover("maju"), verified: true },
  { id: "3", name: "Marcela", handle: "mahportinalli1", avatarUrl: avatar("marcela"), coverUrl: cover("marcela"), verified: true },
  { id: "4", name: "Naih", handle: "Naihporfirio", avatarUrl: avatar("naih"), coverUrl: cover("naih"), verified: true },
  { id: "5", name: "BAD MI | MC MIRELLA", handle: "badmi", avatarUrl: avatar("badmi"), coverUrl: cover("badmi"), verified: true },
  { id: "6", name: "Ariella", handle: "Arielvip", avatarUrl: avatar("ariella"), coverUrl: cover("ariella"), verified: true },
];

export type OfertaItem = CreatorBase & { discountLabel?: string };
export const ofertas: OfertaItem[] = [
  { id: "o1", name: "Ju Santo", handle: "jusantoVIP", avatarUrl: avatar("ju"), coverUrl: cover("ju"), verified: true },
  { id: "o2", name: "Ariella", handle: "Arielvip", avatarUrl: avatar("ariella"), coverUrl: cover("ariella2"), verified: true },
  { id: "o3", name: "Samyof", handle: "Samyof", avatarUrl: avatar("samy"), coverUrl: cover("samy"), verified: true },
  { id: "o4", name: "Hotwife_Wi", handle: "Hotwife_Wi", avatarUrl: avatar("hot"), coverUrl: cover("hot"), verified: true },
  { id: "o5", name: "Gabriellyald", handle: "gabriellyald", avatarUrl: avatar("gab"), coverUrl: cover("gab"), verified: true },
  { id: "o6", name: "CASALXXX10", handle: "CASALXXX10", avatarUrl: avatar("casal"), coverUrl: cover("casal"), discountLabel: "50%" },
  { id: "o7", name: "Bunny", handle: "Maylancys", avatarUrl: avatar("bunny"), coverUrl: cover("bunny"), verified: true },
];

export const perfisGratuitos: CreatorBase[] = [
  { id: "p1", name: "Nany", handle: "uwu_nany", avatarUrl: avatar("nany"), coverUrl: wideCover("nany"), verified: true },
  { id: "p2", name: "Mia Whitte", handle: "miawhitte", avatarUrl: avatar("mia"), coverUrl: wideCover("mia"), verified: true },
  { id: "p3", name: "Momoi", handle: "momoigothfree", avatarUrl: avatar("momoi"), coverUrl: wideCover("momoi"), verified: true },
  { id: "p4", name: "Stuart liro", handle: "Stuart12", avatarUrl: avatar("stuart"), coverUrl: wideCover("stuart"), verified: true },
  { id: "p5", name: "Lais Dias Grátis", handle: "laisdiasgratis", avatarUrl: avatar("laisg"), coverUrl: wideCover("laisg"), verified: true },
  { id: "p6", name: "Feli", handle: "feli_free", avatarUrl: avatar("feli"), coverUrl: wideCover("feli"), verified: true },
];

export const maisMimadas: CreatorBase[] = [
  { id: "m1", name: "OLÍVIA BIA", handle: "Oliviabian", avatarUrl: avatar("olivia"), coverUrl: cover("olivia3"), verified: true },
  { id: "m2", name: "Camila Be", handle: "CamilaBec", avatarUrl: avatar("camila"), coverUrl: cover("camila"), verified: true },
  { id: "m3", name: "Reed", handle: "Reed", avatarUrl: avatar("reed"), coverUrl: cover("reed"), verified: true },
  { id: "m4", name: "Denise Roc", handle: "deniserocha", avatarUrl: avatar("denise"), coverUrl: cover("denise"), verified: true },
  { id: "m5", name: "Maju Garcia", handle: "majugarcia", avatarUrl: avatar("maju"), coverUrl: cover("maju2"), verified: true },
  { id: "m6", name: "A COROA M", handle: "AlineFisch", avatarUrl: avatar("coroa"), coverUrl: cover("coroa"), verified: true },
  { id: "m7", name: "Letícia Feffer", handle: "Professora", avatarUrl: avatar("leticia"), coverUrl: cover("leticia"), verified: true },
];

export type RumoItem = CreatorBase & { photos: number; videos: number };
export const rumoAoTopo: RumoItem[] = [
  { id: "r1", name: "Pedrin Mc", handle: "Pedrinmc", avatarUrl: avatar("pedrin"), coverUrl: wideCover("pedrin"), photos: 50, videos: 50 },
  { id: "r2", name: "andressaurach", handle: "Andressaurach", avatarUrl: avatar("andressa"), coverUrl: wideCover("andressa"), photos: 450, videos: 322 },
  { id: "r3", name: "Victor", handle: "victormt", avatarUrl: avatar("victor"), coverUrl: wideCover("victor"), photos: 3, videos: 30 },
  { id: "r4", name: "laraa12", handle: "larinhaa12", avatarUrl: avatar("laraa"), coverUrl: wideCover("laraa"), photos: 4, videos: 1 },
  { id: "r5", name: "alf", handle: "alf_dh", avatarUrl: avatar("alf"), coverUrl: wideCover("alf"), photos: 12, videos: 8 },
  { id: "r6", name: "Carolborges", handle: "Carolbb", avatarUrl: avatar("carol"), coverUrl: wideCover("carol"), photos: 90, videos: 20 },
];

export const emAltaNosPosts: CreatorBase[] = [
  { id: "e1", name: "Ester Muniz", handle: "Esttermuniz", avatarUrl: avatar("ester"), coverUrl: wideCover("ester") },
  { id: "e2", name: "Loiradocorno", handle: "Loiradocorno", avatarUrl: avatar("loira"), coverUrl: wideCover("loira"), verified: true },
  { id: "e3", name: "Brida Nunes", handle: "bridanunes", avatarUrl: avatar("brida"), coverUrl: wideCover("brida"), verified: true },
  { id: "e4", name: "BAD MI | MC MIRELLA", handle: "badmi", avatarUrl: avatar("badmi"), coverUrl: wideCover("badmi"), verified: true },
  { id: "e5", name: "Pistolinhaanao", handle: "Pistolinhaoficial", avatarUrl: avatar("pistola"), coverUrl: wideCover("pistola"), verified: true },
  { id: "e6", name: "Pih", handle: "Mcpipokinha", avatarUrl: avatar("pih"), coverUrl: wideCover("pih"), verified: true },
];

export type ChatItem = CreatorBase & { statusLabel: string };
export const bombandoNoChat: ChatItem[] = [
  { id: "c1", name: "Nany", handle: "uwu_nany", avatarUrl: avatar("nany"), coverUrl: "", verified: true, statusLabel: "Responde em instantes" },
  { id: "c2", name: "Hanabi", handle: "hanabi", avatarUrl: avatar("hanabi"), coverUrl: "", verified: true, statusLabel: "Responde em instantes" },
  { id: "c3", name: "Reed", handle: "Reed", avatarUrl: avatar("reed"), coverUrl: "", verified: true, statusLabel: "Responde em instantes" },
  { id: "c4", name: "Mia Whitte", handle: "miawhitte", avatarUrl: avatar("mia"), coverUrl: "", verified: true, statusLabel: "Responde em instantes" },
  { id: "c5", name: "Martina Olvr", handle: "martinaolvr", avatarUrl: avatar("martina"), coverUrl: "", verified: true, statusLabel: "Responde em instantes" },
  { id: "c6", name: "Isadoravale", handle: "isadoravale", avatarUrl: avatar("isadora"), coverUrl: "", verified: true, statusLabel: "Responde em instantes" },
];

export type UmAUmItem = CreatorBase & { discountLabel?: string };
export const chamadaUmAUm: UmAUmItem[] = [
  { id: "u1", name: "Gaby", handle: "gabylopez", avatarUrl: avatar("gaby"), coverUrl: cover("gaby"), verified: true, discountLabel: "80% OFF NA ASSINATURA" },
  { id: "u2", name: "Denise Rocha EX FAZENDA", handle: "deniserocha", avatarUrl: avatar("denise"), coverUrl: cover("denise2"), verified: true },
  { id: "u3", name: "Casal_amador", handle: "Casal_amador2022", avatarUrl: avatar("casal2"), coverUrl: cover("casal2"), verified: true },
  { id: "u4", name: "Reed", handle: "Reed", avatarUrl: avatar("reed"), coverUrl: cover("reed2"), verified: true },
];

export type LiveItem = CreatorBase & { livesLast7Days: number };
export const liveNasAlturas: LiveItem[] = [
  { id: "l1", name: "ThaissaFit", handle: "thaissafit", avatarUrl: avatar("thaissa"), coverUrl: cover("thaissa"), verified: true, livesLast7Days: 4 },
  { id: "l2", name: "Reed", handle: "Reed", avatarUrl: avatar("reed"), coverUrl: cover("reed3"), verified: true, livesLast7Days: 3 },
  { id: "l3", name: "Lais Dias loira", handle: "laisdias", avatarUrl: avatar("laisl"), coverUrl: cover("laisl"), verified: true, livesLast7Days: 4 },
  { id: "l4", name: "Japa Nordestina", handle: "japanordestina", avatarUrl: avatar("japa"), coverUrl: cover("japa"), verified: true, livesLast7Days: 2 },
];
