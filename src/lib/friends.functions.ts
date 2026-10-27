import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PublicFriend = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type IncomingFriend = {
  friendshipId: string;
  ownerUserId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  accountType: string | null;
  visible: boolean;
  createdAt: string;
};

export const addFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { friendUserId: string }) =>
    z.object({ friendUserId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.friendUserId === context.userId) throw new Error("cannot_friend_self");
    const { error } = await context.supabase
      .from("friendships")
      .upsert(
        { owner_id: context.userId, friend_id: data.friendUserId },
        { onConflict: "owner_id,friend_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { friendUserId: string }) =>
    z.object({ friendUserId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("friendships")
      .delete()
      .eq("owner_id", context.userId)
      .eq("friend_id", data.friendUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const isFriend = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { friendUserId: string }) =>
    z.object({ friendUserId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("friendships")
      .select("id")
      .eq("owner_id", context.userId)
      .eq("friend_id", data.friendUserId)
      .maybeSingle();
    return { isFriend: !!row };
  });

/**
 * Public friends of a profile: everyone this user (userId) has ADDED.
 * RLS filters out rows where the destination hid the row or has
 * restrict_friendships globally.
 */
export const listPublicFriends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; limit?: number }) =>
    z.object({ userId: z.string().uuid(), limit: z.number().min(1).max(60).optional() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<PublicFriend[]> => {
    const limit = data.limit ?? 30;
    const { data: rows, error } = await context.supabase
      .from("friendships")
      .select("friend_id, created_at, visible")
      .eq("owner_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.friend_id as string);
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles_public" as any)
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", ids);
    const byId = new Map((profs ?? []).map((p) => [p.user_id as string, p]));
    return (rows ?? [])
      .map((r) => {
        const p = byId.get(r.friend_id as string);
        if (!p) return null;
        return {
          userId: p.user_id as string,
          username: p.username as string,
          displayName: (p.display_name as string | null) ?? null,
          avatarUrl: (p.avatar_url as string | null) ?? null,
          createdAt: r.created_at as string,
        } as PublicFriend;
      })
      .filter((x): x is PublicFriend => !!x);
  });

/**
 * Superfãs: creators/users who have added ME as a friend.
 */
export const listMyIncomingFriends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number; search?: string }) =>
    z
      .object({ limit: z.number().min(1).max(200).optional(), search: z.string().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<IncomingFriend[]> => {
    const limit = data.limit ?? 100;
    const { data: rows, error } = await context.supabase
      .from("friendships")
      .select("id, owner_id, visible, created_at")
      .eq("friend_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.owner_id as string);
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles_public" as any)
      .select("user_id, username, display_name, avatar_url, account_type")
      .in("user_id", ids);
    const byId = new Map((profs ?? []).map((p) => [p.user_id as string, p]));
    const q = (data.search ?? "").trim().toLowerCase();
    return (rows ?? [])
      .map((r) => {
        const p = byId.get(r.owner_id as string);
        if (!p) return null;
        return {
          friendshipId: r.id as string,
          ownerUserId: p.user_id as string,
          username: p.username as string,
          displayName: (p.display_name as string | null) ?? null,
          avatarUrl: (p.avatar_url as string | null) ?? null,
          accountType: (p.account_type as string | null) ?? null,
          visible: !!r.visible,
          createdAt: r.created_at as string,
        } as IncomingFriend;
      })
      .filter((x): x is IncomingFriend => !!x)
      .filter((x) => {
        if (!q) return true;
        return (
          x.username.toLowerCase().includes(q) ||
          (x.displayName ?? "").toLowerCase().includes(q)
        );
      });
  });

export const setFriendshipVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { friendshipId: string; visible: boolean }) =>
    z.object({ friendshipId: z.string().uuid(), visible: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("friendships")
      .update({ visible: data.visible })
      .eq("id", data.friendshipId)
      .eq("friend_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
