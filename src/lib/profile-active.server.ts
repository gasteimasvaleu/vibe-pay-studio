const RESERVED_USERNAMES = new Set([
  "admin", "api", "auth", "settings", "perfil", "profile", "monetisexy",
  "monetisex", "root", "support", "help", "about", "login", "logout",
  "signup", "signin", "register", "entrar", "cadastro", "home", "explore",
  "search", "notifications", "messages", "chat", "www", "app", "public",
]);

const USERNAME_RE = /^[a-z0-9_][a-z0-9_]{2,29}$/;

export type ActiveCreatorRow = {
  id: string;
  user_id: string;
  kind: "paid" | "free";
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  x_handle: string | null;
};

export type ProfileAccountRow = {
  active_profile_id: string | null;
  account_type: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location?: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  x_handle: string | null;
  free_avatar_url?: string | null;
  free_username?: string | null;
  free_display_name?: string | null;
};

export function sanitizeHandle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30);
}

export function validateUsername(
  raw: string,
): { ok: true; value: string } | { ok: false; reason: "invalid_format" | "reserved" } {
  const value = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(value)) return { ok: false, reason: "invalid_format" };
  if (value.startsWith("_")) return { ok: false, reason: "invalid_format" };
  if (RESERVED_USERNAMES.has(value)) return { ok: false, reason: "reserved" };
  return { ok: true, value };
}

export function validateDisplayName(raw: string): { ok: true; value: string } | { ok: false } {
  const value = raw.replace(/\s+/g, " ").trim();
  if (value.length < 2 || value.length > 40) return { ok: false };
  if (/[\r\n]/.test(value)) return { ok: false };
  return { ok: true, value };
}

export async function getProfileAndActiveCreator(supabase: any, userId: string) {
  const [profileRes, creatorsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("active_profile_id, account_type, username, display_name, avatar_url, cover_url, bio, location, instagram_handle, tiktok_handle, x_handle, free_avatar_url, free_username, free_display_name")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("creator_profiles")
      .select("id, user_id, kind, username, display_name, avatar_url, cover_url, bio, instagram_handle, tiktok_handle, x_handle")
      .eq("user_id", userId),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (creatorsRes.error) throw new Error(creatorsRes.error.message);

  const profile = (profileRes.data ?? null) as ProfileAccountRow | null;
  const creators = ((creatorsRes.data ?? []) as ActiveCreatorRow[]).filter((row) => row.id);
  const activeCreator =
    creators.find((row) => row.id === profile?.active_profile_id) ??
    creators.find((row) => row.kind === "paid") ??
    creators[0] ??
    null;

  return { profile, activeCreator, creators };
}