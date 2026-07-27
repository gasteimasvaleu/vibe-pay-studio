// Cloudflare Stream Live API helpers.
// Docs: https://developers.cloudflare.com/stream/stream-live/

const CF_API = "https://api.cloudflare.com/client/v4";

function cleanEnv(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function creds() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const rawToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !rawToken) {
    throw new Error("Cloudflare Stream não configurado (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN).");
  }
  const token = cleanEnv(rawToken).replace(/^Bearer\s+/i, "").trim();
  return { accountId: cleanEnv(accountId), token };
}

function cloudflareErrorMessage(status: number, body: any) {
  const firstError = body?.errors?.[0];
  const code = firstError?.code ? ` código ${firstError.code}` : "";
  const message = firstError?.message ?? `HTTP ${status}`;

  if (status === 401 || /authentication/i.test(message)) {
    return `Cloudflare não autenticou a criação da live${code}. Atualize o token do Stream com permissão Stream:Edit para a conta configurada.`;
  }

  if (status === 403 || /permission|not authorized|forbidden/i.test(message)) {
    return `Cloudflare recusou permissão para criar a live${code}. O token precisa ter acesso de edição ao Cloudflare Stream nessa conta.`;
  }

  return `Cloudflare Stream falhou${code}: ${message}`;
}

async function cf<T = any>(path: string, init?: RequestInit): Promise<T> {
  const { accountId, token } = creds();
  const url = `${CF_API}/accounts/${accountId}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({} as any));
  if (!res.ok || (body as any)?.success === false) {
    const err = cloudflareErrorMessage(res.status, body);
    console.warn("[cloudflare-stream] request failed", {
      status: res.status,
      code: (body as any)?.errors?.[0]?.code ?? null,
      message: (body as any)?.errors?.[0]?.message ?? null,
      path,
    });
    throw new Error(err);
  }
  return (body as any).result as T;
}

export type LiveInput = {
  uid: string;
  webRTC?: { url?: string };
  webRTCPlayback?: { url?: string };
  rtmps?: { url?: string; streamKey?: string };
  playback?: { hls?: string; dash?: string };
};

/** Cria um Live Input com WHIP + WHEP habilitados. */
export async function createLiveInput(meta: { name: string }): Promise<LiveInput> {
  return await cf<LiveInput>("/stream/live_inputs", {
    method: "POST",
    body: JSON.stringify({
      meta: { name: meta.name },
      recording: { mode: "off" },
      defaultCreator: meta.name,
    }),
  });
}

export async function getLiveInput(uid: string): Promise<LiveInput> {
  return await cf<LiveInput>(`/stream/live_inputs/${uid}`);
}

export async function deleteLiveInput(uid: string): Promise<void> {
  await cf(`/stream/live_inputs/${uid}`, { method: "DELETE" });
}

/**
 * Lista os vídeos (outputs) gerados por um Live Input.
 * Cada vídeo tem seu próprio UID — é ele que precisa entrar no whepUrl,
 * NÃO o UID do Live Input.
 * Ref: GET /accounts/:id/stream/live_inputs/:uid/videos
 */
export type LiveInputVideo = {
  uid: string;
  created: string;
  status?: { state?: string };
};

export async function listLiveInputVideos(liveInputUid: string): Promise<LiveInputVideo[]> {
  const result = await cf<LiveInputVideo[]>(`/stream/live_inputs/${liveInputUid}/videos`);
  return Array.isArray(result) ? result : [];
}

/**
 * Extrai o host `customer-<hash>.cloudflarestream.com` de uma URL do Cloudflare Stream.
 * Retorna null quando a URL não tem esse padrão.
 */
function extractCustomerHost(anyStreamUrl: string | null | undefined): string | null {
  if (!anyStreamUrl) return null;
  try {
    const u = new URL(anyStreamUrl);
    if (/^customer-[a-z0-9]+\.cloudflarestream\.com$/i.test(u.host)) return u.host;
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve o whepUrl real do vídeo ao vivo em andamento.
 * - Usa o UID do vídeo (não do Live Input) — sem isso o WHEP responde sem tracks.
 * - Retorna null quando ainda não há vídeo publicando.
 *
 * @param liveInputUid   UID do Live Input.
 * @param sampleStreamUrl  Qualquer URL customer-*.cloudflarestream.com salva
 *                         antes (cf_webrtc_url ou cf_webrtc_play_url) para
 *                         extrair o host correto sem chamada extra.
 */
export async function resolveActiveWhepUrl(
  liveInputUid: string,
  sampleStreamUrl?: string | null,
): Promise<string | null> {
  let host = extractCustomerHost(sampleStreamUrl);
  if (!host) {
    // Fallback: busca o Live Input para descobrir o host `customer-<hash>`.
    try {
      const li = await getLiveInput(liveInputUid);
      host = extractCustomerHost(li.webRTCPlayback?.url) ?? extractCustomerHost(li.webRTC?.url);
    } catch (e) {
      console.warn("[cloudflare-stream] resolveActiveWhepUrl: failed to load live input", e);
    }
  }
  if (!host) return null;

  let videos: LiveInputVideo[];
  try {
    videos = await listLiveInputVideos(liveInputUid);
  } catch (e) {
    console.warn("[cloudflare-stream] resolveActiveWhepUrl: list videos failed", e);
    return null;
  }
  if (!videos.length) return null;

  const active = videos.find((v) => v.status?.state === "live-inprogress");
  const chosen = active ?? [...videos].sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""))[0];
  if (!chosen?.uid) return null;

  return `https://${host}/${chosen.uid}/webRTC/play`;
}

