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
