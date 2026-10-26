import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PublicCreator } from "./public-directory.server";

export type { PublicCreator };

export const listPublicCreators = createServerFn({ method: "GET" })
  .inputValidator((i: { q?: string }) => z.object({ q: z.string().max(60).optional() }).parse(i))
  .handler(async ({ data }): Promise<PublicCreator[]> => {
    const { fetchDirectory } = await import("./public-directory.server");
    return fetchDirectory(data.q?.trim() || null, 60, 0);
  });

export const getPublicCreator = createServerFn({ method: "GET" })
  .inputValidator((i: { username: string }) =>
    z.object({ username: z.string().min(1).max(40) }).parse(i),
  )
  .handler(async ({ data }): Promise<PublicCreator | null> => {
    const { publicClient } = await import("./public-directory.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (publicClient() as any).rpc("public_creator_by_username", {
      _username: data.username,
    });
    if (error) throw new Error(error.message);
    const r = (rows ?? [])[0] as PublicCreator | undefined;
    if (!r) return null;
    return { ...r, price_monthly: r.price_monthly != null ? Number(r.price_monthly) : null };
  });

export type MyListing = { profileId: string; enabled: boolean; status: string } | null;

async function activeProfileId(supabase: any, userId: string) {
  const { getActiveProfileIdFor } = await import("./profile-active.server");
  return getActiveProfileIdFor(supabase, userId);
}

export const getMyPublicListing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyListing> => {
    const id = await activeProfileId(context.supabase, context.userId);
    if (!id) return null;
    const { data, error } = await (context.supabase as any)
      .from("creator_profiles")
      .select("id, public_listing, public_listing_status")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { profileId: data.id, enabled: !!data.public_listing, status: data.public_listing_status };
  });

export const setMyPublicListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { enabled: boolean }) => z.object({ enabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }): Promise<MyListing> => {
    const id = await activeProfileId(context.supabase, context.userId);
    if (!id) throw new Error("Você ainda não tem um perfil de creator.");
    const { data: row, error } = await (context.supabase as any)
      .from("creator_profiles")
      .update({ public_listing: data.enabled })
      .eq("id", id)
      .eq("user_id", context.userId)
      .select("id, public_listing, public_listing_status")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Não foi possível salvar.");
    return { profileId: row.id, enabled: !!row.public_listing, status: row.public_listing_status };
  });

export type ListingRequest = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  public_listing_status: string;
  updated_at: string;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("acesso negado");
}

export const adminListPublicListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { status: string }) =>
    z.object({ status: z.enum(["pending", "approved", "rejected"]) }).parse(i),
  )
  .handler(async ({ data, context }): Promise<ListingRequest[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await (context.supabase as any)
      .from("creator_profiles")
      .select("id, username, display_name, avatar_url, cover_url, bio, public_listing_status, updated_at")
      .eq("public_listing", true)
      .eq("public_listing_status", data.status)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []) as ListingRequest[];
  });

export const adminReviewPublicListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: "approved" | "rejected" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await (context.supabase as any).rpc("admin_review_public_listing", {
      _creator_profile_id: data.id,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
