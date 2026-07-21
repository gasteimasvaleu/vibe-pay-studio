import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const updateAvatarUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { avatarUrl: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const url = data.avatarUrl.trim();
    if (!url) throw new Error("url inválida");
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { avatarUrl: url };
  });

export const updateCoverUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { coverUrl: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const url = data.coverUrl.trim();
    if (!url) throw new Error("url inválida");
    const { error } = await supabase
      .from("profiles")
      .update({ cover_url: url })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { coverUrl: url };
  });

export const updateProfileDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bio: string; location: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const bioTrimmed = data.bio.trim();
    const locTrimmed = data.location.replace(/\s+/g, " ").trim();
    if (bioTrimmed.length > 3000) throw new Error("bio muito longa");
    if (locTrimmed.length > 120) throw new Error("localização muito longa");
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: bioTrimmed.length ? bioTrimmed : null,
        location: locTrimmed.length ? locTrimmed : null,
      })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, bio: bioTrimmed, location: locTrimmed } as const;
  });

const sanitizeHandle = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30);

export const updateSocialLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { instagram: string; tiktok: string; x: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ig = sanitizeHandle(data.instagram);
    const tk = sanitizeHandle(data.tiktok);
    const xh = sanitizeHandle(data.x);
    const { error } = await supabase
      .from("profiles")
      .update({
        instagram_handle: ig.length ? ig : null,
        tiktok_handle: tk.length ? tk : null,
        x_handle: xh.length ? xh : null,
      })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, instagram: ig, tiktok: tk, x: xh } as const;
  });

const RESERVED_USERNAMES = new Set([
  "admin", "api", "auth", "settings", "perfil", "profile", "monetisexy",
  "monetisex", "root", "support", "help", "about", "login", "logout",
  "signup", "signin", "register", "entrar", "cadastro", "home", "explore",
  "search", "notifications", "messages", "chat", "www", "app", "public",
]);

const USERNAME_RE = /^[a-z0-9_][a-z0-9_]{2,29}$/;

function validateUsername(raw: string): { ok: true; value: string } | { ok: false; reason: "invalid_format" | "reserved" } {
  const value = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(value)) return { ok: false, reason: "invalid_format" };
  if (value.startsWith("_")) return { ok: false, reason: "invalid_format" };
  if (RESERVED_USERNAMES.has(value)) return { ok: false, reason: "reserved" };
  return { ok: true, value };
}

function validateDisplayName(raw: string): { ok: true; value: string } | { ok: false } {
  const value = raw.replace(/\s+/g, " ").trim();
  if (value.length < 2 || value.length > 40) return { ok: false };
  if (/[\r\n]/.test(value)) return { ok: false };
  return { ok: true, value };
}

export const checkUsernameAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data, context }) => {
    const check = validateUsername(data.username);
    if (!check.ok) {
      return { available: false, isSelf: false, reason: check.reason } as const;
    }
    const { supabase, userId } = context;
    const [profilesRes, creatorProfilesRes] = await Promise.all([
      supabase.from("profiles").select("user_id").eq("username", check.value).maybeSingle(),
      supabase.from("creator_profiles").select("user_id").eq("username", check.value).maybeSingle(),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (creatorProfilesRes.error) throw new Error(creatorProfilesRes.error.message);

    const owners = new Set<string>();
    if (profilesRes.data?.user_id) owners.add(profilesRes.data.user_id);
    if (creatorProfilesRes.data?.user_id) owners.add(creatorProfilesRes.data.user_id);

    if (owners.size === 0) return { available: true, isSelf: false } as const;
    if (owners.size === 1 && owners.has(userId)) return { available: true, isSelf: true } as const;
    return { available: false, isSelf: false, reason: "taken" } as const;
  });

export const updateProfileIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { displayName: string; username: string }) => data)
  .handler(async ({ data, context }) => {
    const nameCheck = validateDisplayName(data.displayName);
    if (!nameCheck.ok) return { ok: false, reason: "invalid_display_name" } as const;
    const userCheck = validateUsername(data.username);
    if (!userCheck.ok) return { ok: false, reason: userCheck.reason } as const;
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: nameCheck.value, username: userCheck.value })
      .eq("user_id", userId);
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return { ok: false, reason: "username_taken" } as const;
      }
      throw new Error(error.message);
    }
    return { ok: true, displayName: nameCheck.value, username: userCheck.value } as const;
  });
