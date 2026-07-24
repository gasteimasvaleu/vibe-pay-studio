import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getProfileAndActiveCreator,
  sanitizeHandle,
  validateDisplayName,
  validateUsername,
} from "@/lib/profile-active.server";

export const updateAvatarUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { avatarUrl: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const url = data.avatarUrl.trim();
    if (!url) throw new Error("url inválida");

    const { activeCreator } = await getProfileAndActiveCreator(supabase, userId);
    if (activeCreator) {
      const { error: cpErr } = await supabase
        .from("creator_profiles")
        .update({ avatar_url: url })
        .eq("id", activeCreator.id)
        .eq("user_id", userId);
      if (cpErr) throw new Error(cpErr.message);
    }

    const updates: { avatar_url?: string; free_avatar_url?: string | null } = {};
    if (!activeCreator || activeCreator.kind === "paid") updates.avatar_url = url;
    if (activeCreator?.kind === "free") updates.free_avatar_url = url;

    if (!Object.keys(updates).length) return { avatarUrl: url };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
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

    const { activeCreator } = await getProfileAndActiveCreator(supabase, userId);
    if (activeCreator) {
      const { error: cpErr } = await supabase
        .from("creator_profiles")
        .update({ cover_url: url })
        .eq("id", activeCreator.id)
        .eq("user_id", userId);
      if (cpErr) throw new Error(cpErr.message);
    }

    if (!activeCreator || activeCreator.kind === "paid") {
      const { error } = await supabase
        .from("profiles")
        .update({ cover_url: url })
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    }

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

    const { activeCreator } = await getProfileAndActiveCreator(supabase, userId);
    if (activeCreator) {
      const { error: cpErr } = await supabase
        .from("creator_profiles")
        .update({ bio: bioTrimmed.length ? bioTrimmed : null })
        .eq("id", activeCreator.id)
        .eq("user_id", userId);
      if (cpErr) throw new Error(cpErr.message);
    }

    const profileUpdates: { bio?: string | null; location: string | null } = {
      location: locTrimmed.length ? locTrimmed : null,
    };
    if (!activeCreator || activeCreator.kind === "paid") {
      profileUpdates.bio = bioTrimmed.length ? bioTrimmed : null;
    }

    const { error } = await supabase.from("profiles").update(profileUpdates).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, bio: bioTrimmed, location: locTrimmed } as const;
  });

export const updateSocialLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { instagram: string; tiktok: string; x: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ig = sanitizeHandle(data.instagram);
    const tk = sanitizeHandle(data.tiktok);
    const xh = sanitizeHandle(data.x);

    const { activeCreator } = await getProfileAndActiveCreator(supabase, userId);
    if (activeCreator) {
      const { error: cpErr } = await supabase
        .from("creator_profiles")
        .update({
          instagram_handle: ig.length ? ig : null,
          tiktok_handle: tk.length ? tk : null,
          x_handle: xh.length ? xh : null,
        })
        .eq("id", activeCreator.id)
        .eq("user_id", userId);
      if (cpErr) throw new Error(cpErr.message);
    }

    if (!activeCreator || activeCreator.kind === "paid") {
      const { error } = await supabase
        .from("profiles")
        .update({
          instagram_handle: ig.length ? ig : null,
          tiktok_handle: tk.length ? tk : null,
          x_handle: xh.length ? xh : null,
        })
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    }

    return { ok: true, instagram: ig, tiktok: tk, x: xh } as const;
  });

export const checkUsernameAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data, context }) => {
    const check = validateUsername(data.username);
    if (!check.ok) {
      return { available: false, isSelf: false, reason: check.reason } as const;
    }
    const { supabase, userId } = context;
    const { activeCreator } = await getProfileAndActiveCreator(supabase, userId);
    const [profilesRes, creatorProfilesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, username").eq("username", check.value).maybeSingle(),
      supabase.from("creator_profiles").select("id, user_id, username").eq("username", check.value).maybeSingle(),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (creatorProfilesRes.error) throw new Error(creatorProfilesRes.error.message);

    const profileOwner = profilesRes.data?.user_id as string | undefined;
    const creatorOwner = creatorProfilesRes.data?.user_id as string | undefined;
    const creatorId = creatorProfilesRes.data?.id as string | undefined;

    if (profileOwner && profileOwner !== userId) {
      return { available: false, isSelf: false, reason: "taken" } as const;
    }
    if (creatorOwner && creatorOwner !== userId) {
      return { available: false, isSelf: false, reason: "taken" } as const;
    }
    if (activeCreator) {
      if (creatorId && creatorId !== activeCreator.id) {
        return { available: false, isSelf: false, reason: "taken" } as const;
      }
      if (profileOwner && !creatorId && activeCreator.kind === "free") {
        return { available: false, isSelf: false, reason: "taken" } as const;
      }
      if (creatorId === activeCreator.id) {
        return { available: true, isSelf: true } as const;
      }
      return { available: true, isSelf: false } as const;
    }

    if (profileOwner === userId) return { available: true, isSelf: true } as const;
    if (creatorOwner === userId) return { available: false, isSelf: false, reason: "taken" } as const;
    return { available: true, isSelf: false } as const;
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
    const { activeCreator } = await getProfileAndActiveCreator(supabase, userId);

    const [existingProfileRes, existingCreatorRes] = await Promise.all([
      supabase.from("profiles").select("user_id").eq("username", userCheck.value).maybeSingle(),
      supabase.from("creator_profiles").select("user_id, id").eq("username", userCheck.value).maybeSingle(),
    ]);
    if (existingProfileRes.error) throw new Error(existingProfileRes.error.message);
    if (existingCreatorRes.error) throw new Error(existingCreatorRes.error.message);

    const existingProfile = existingProfileRes.data;
    const existingCreator = existingCreatorRes.data;
    if (existingProfile && existingProfile.user_id !== userId) return { ok: false, reason: "username_taken" } as const;
    if (existingCreator && existingCreator.user_id !== userId) return { ok: false, reason: "username_taken" } as const;
    if (activeCreator && existingCreator && existingCreator.id !== activeCreator.id) return { ok: false, reason: "username_taken" } as const;
    if (activeCreator?.kind === "free" && existingProfile && !existingCreator) return { ok: false, reason: "username_taken" } as const;

    if (activeCreator) {
      const { error: cpErr } = await supabase
        .from("creator_profiles")
        .update({ display_name: nameCheck.value, username: userCheck.value })
        .eq("id", activeCreator.id)
        .eq("user_id", userId);
      if (cpErr) {
        if ((cpErr as { code?: string }).code === "23505") {
          return { ok: false, reason: "username_taken" } as const;
        }
        throw new Error(cpErr.message);
      }
    }

    const profileUpdates = activeCreator?.kind === "free"
      ? { free_display_name: nameCheck.value, free_username: userCheck.value }
      : { display_name: nameCheck.value, username: userCheck.value };

    const { error } = await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("user_id", userId);
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return { ok: false, reason: "username_taken" } as const;
      }
      throw new Error(error.message);
    }
    return { ok: true, displayName: nameCheck.value, username: userCheck.value } as const;
  });
