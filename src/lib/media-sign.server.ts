/**
 * Server-only: turns stored storage paths into short-lived signed URLs.
 * The DB stores only paths; callers must have already checked that the
 * viewer may see the rows they pass in (RLS / can_see_* checks).
 */
export const MEDIA_URL_TTL = 60 * 60; // 1 hora

/** Accepts a raw path or a legacy signed URL and returns the storage path. */
export function toStoragePath(value: string | null | undefined, bucket: string): string | null {
  if (!value) return null;
  const marker = `/object/sign/${bucket}/`;
  const i = value.indexOf(marker);
  if (i >= 0) return decodeURIComponent(value.slice(i + marker.length).split("?")[0]);
  if (/^https?:\/\//i.test(value) || value.startsWith("blob:") || value.startsWith("data:")) return null;
  return value;
}

export async function signPaths(bucket: string, values: Array<string | null | undefined>): Promise<Map<string, string>> {
  const paths = Array.from(new Set(values.map((v) => toStoragePath(v, bucket)).filter((p): p is string => !!p)));
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrls(paths, MEDIA_URL_TTL);
  for (const s of data ?? []) if (s.path && s.signedUrl) out.set(s.path, s.signedUrl);
  return out;
}

function resolve(map: Map<string, string>, value: string | null | undefined, bucket: string): string | null {
  if (!value) return null;
  const p = toStoragePath(value, bucket);
  if (!p) return value; // external URL (e.g. not ours) — leave untouched
  return map.get(p) ?? null;
}

type AnyObj = Record<string, any>;

/**
 * Re-signs URL fields on publication-like outputs: top-level url, cover_url,
 * preview_url, audio_url and media[].url. Mutates and returns the same array.
 */
export async function signPublicationOutputs<T extends AnyObj>(items: T[], bucket = "publications"): Promise<T[]> {
  const keys = ["url", "cover_url", "preview_url", "audio_url"];
  const vals: Array<string | null> = [];
  for (const it of items) {
    for (const k of keys) if (typeof it[k] === "string") vals.push(it[k]);
    if (Array.isArray(it.media)) for (const m of it.media) if (typeof m?.url === "string") vals.push(m.url);
  }
  const map = await signPaths(bucket, vals);
  for (const it of items as AnyObj[]) {
    for (const k of keys) if (typeof it[k] === "string") it[k] = resolve(map, it[k], bucket);
    if (Array.isArray(it.media)) for (const m of it.media) if (typeof m?.url === "string") m.url = resolve(map, m.url, bucket) ?? "";
  }
  return items;
}

export async function signStrings(values: string[], bucket = "publications"): Promise<string[]> {
  const map = await signPaths(bucket, values);
  return values.map((v) => resolve(map, v, bucket)).filter((v): v is string => !!v);
}

/** Re-signs a single string field on each object (e.g. thumb_url). */
export async function signField<T extends AnyObj>(items: T[], get: (it: T) => string | null | undefined, set: (it: T, v: string | null) => void, bucket = "publications"): Promise<T[]> {
  const map = await signPaths(bucket, items.map(get));
  for (const it of items) {
    const v = get(it);
    if (typeof v === "string") set(it, resolve(map, v, bucket));
  }
  return items;
}
