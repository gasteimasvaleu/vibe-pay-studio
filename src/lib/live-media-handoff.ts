// Passa o MediaStream já autorizado da tela de configuração para a de transmissão,
// evitando um segundo prompt de câmera/microfone quando o usuário clica em "Iniciar transmissão".

type Handoff = {
  liveId: string;
  stream: MediaStream;
  videoDeviceId?: string;
  audioDeviceId?: string;
};

let pending: Handoff | null = null;

export function stashLiveMedia(h: Handoff) {
  // Se já houver algo pendente para outra live, encerra os tracks antigos.
  if (pending && pending.liveId !== h.liveId) {
    pending.stream.getTracks().forEach((t) => t.stop());
  }
  pending = h;
}

export function takeLiveMedia(liveId: string): Handoff | null {
  if (!pending || pending.liveId !== liveId) return null;
  const h = pending;
  pending = null;
  return h;
}

export function discardLiveMedia() {
  if (!pending) return;
  pending.stream.getTracks().forEach((t) => t.stop());
  pending = null;
}
