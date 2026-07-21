// Server-only helpers for Daily.co room + token creation.
// Never import from client-reachable modules directly; only from server function handlers.

const DAILY_API = "https://api.daily.co/v1";

function apiKey(): string {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error("DAILY_API_KEY is not configured");
  return key;
}

async function dailyFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${DAILY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Daily API ${res.status}: ${body}`);
  }
  return res.json() as Promise<any>;
}

/**
 * Create (or fetch) a private Daily room bound to a video_call id.
 * Rooms auto-expire after `expSeconds` and are capped to 2 participants.
 */
export async function dailyEnsureRoom(
  callId: string,
  expSeconds: number,
): Promise<{ name: string; url: string }> {
  const name = `call-${callId}`.slice(0, 40);
  const nowSec = Math.floor(Date.now() / 1000);
  try {
    const existing = await dailyFetch(`/rooms/${name}`);
    return { name: existing.name, url: existing.url };
  } catch {
    // Not found — create it.
  }
  const created = await dailyFetch("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        exp: nowSec + expSeconds,
        max_participants: 2,
        enable_screenshare: true,
        enable_chat: false,
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  });
  return { name: created.name, url: created.url };
}

/**
 * Issue a short-lived meeting token for a specific participant on a given room.
 */
export async function dailyCreateToken(params: {
  roomName: string;
  userName: string;
  userId: string;
  isOwner: boolean;
  expSeconds: number;
}): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const res = await dailyFetch("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: params.roomName,
        user_name: params.userName,
        user_id: params.userId,
        is_owner: params.isOwner,
        exp: nowSec + params.expSeconds,
      },
    }),
  });
  return res.token as string;
}
