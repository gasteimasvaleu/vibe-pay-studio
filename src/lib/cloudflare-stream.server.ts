// Cloudflare Stream Live API helpers.
// Docs: https://developers.cloudflare.com/stream/stream-live/

const CF_API = "https://api.cloudflare.com/client/v4";

function creds() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("Cloudflare Stream não configurado (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN).");
  }
  return { accountId, token };
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
    const err = (body as any)?.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`[cloudflare-stream] ${err}`);
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
