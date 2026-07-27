import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("acesso negado");
}

async function logAudit(
  supabase: any,
  actorId: string,
  action: string,
  targetTable: string | null,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_table: targetTable,
    target_id: targetId,
    metadata,
  });
}

async function hydrateProfiles(supabase: any, ids: (string | null | undefined)[]) {
  const clean = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (clean.length === 0) return {} as Record<string, any>;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url")
    .in("user_id", clean);
  const map: Record<string, any> = {};
  (data ?? []).forEach((p: any) => (map[p.user_id] = p));
  return map;
}

// ============ LIVES ============
export const listAdminLives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("live_sessions")
      .select(
        "id, creator_id, title, status, started_at, ended_at, viewers_peak, total_views, gross_cents, tips_cents, price_cents, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const profs = await hydrateProfiles(supabase, (rows ?? []).map((r: any) => r.creator_id));
    return (rows ?? []).map((r: any) => ({ ...r, creator: profs[r.creator_id] ?? null }));
  });

export const endLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { liveId: string; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("live_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.liveId);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "live.ended_by_admin", "live_sessions", data.liveId, {
      reason: data.reason,
    });
    return { ok: true };
  });

// ============ STORIES ============
export const listAdminStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { onlyActive?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("stories")
      .select(
        "id, creator_id, media_type, price_cents, caption, published_at, expires_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.onlyActive) q = q.gt("expires_at", new Date().toISOString());
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const profs = await hydrateProfiles(supabase, (rows ?? []).map((r: any) => r.creator_id));
    return (rows ?? []).map((r: any) => ({ ...r, creator: profs[r.creator_id] ?? null }));
  });

export const removeStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storyId: string; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.from("stories").delete().eq("id", data.storyId);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "story.removed_by_admin", "stories", data.storyId, {
      reason: data.reason,
    });
    return { ok: true };
  });

// ============ BROADCASTS ============
export const listAdminBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("broadcast_jobs")
      .select(
        "id, creator_id, audience, price_cents, total_recipients, sent_count, failed_count, status, scheduled_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const profs = await hydrateProfiles(supabase, (rows ?? []).map((r: any) => r.creator_id));
    return (rows ?? []).map((r: any) => ({ ...r, creator: profs[r.creator_id] ?? null }));
  });

export const cancelBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId: string; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("broadcast_jobs")
      .update({ status: "cancelled" })
      .eq("id", data.jobId)
      .in("status", ["queued", "scheduled"]);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "broadcast.cancelled", "broadcast_jobs", data.jobId, {
      reason: data.reason,
    });
    return { ok: true };
  });

// ============ VIDEO CALLS ============
export const listAdminVideoCalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("video_calls")
      .select(
        "id, requester_id, creator_id, duration_minutes, price_cents, status, payment_status, scheduled_at, started_at, ended_at, expires_at, created_at, room_url",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status as any);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const profs = await hydrateProfiles(
      supabase,
      (rows ?? []).flatMap((r: any) => [r.requester_id, r.creator_id]),
    );
    return (rows ?? []).map((r: any) => ({
      ...r,
      requester: profs[r.requester_id] ?? null,
      creator: profs[r.creator_id] ?? null,
    }));
  });

export const endVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("video_calls")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", data.callId);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "videocall.force_ended", "video_calls", data.callId, {
      reason: data.reason,
    });
    return { ok: true };
  });

// ============ SUBSCRIPTIONS ============
export const listAdminSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("subscriptions")
      .select(
        "id, subscriber_id, creator_id, plan, status, price_cents_paid, auto_renew, started_at, current_period_end, cancelled_at, provider, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status as any);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const profs = await hydrateProfiles(
      supabase,
      (rows ?? []).flatMap((r: any) => [r.subscriber_id, r.creator_id]),
    );
    return (rows ?? []).map((r: any) => ({
      ...r,
      subscriber: profs[r.subscriber_id] ?? null,
      creator: profs[r.creator_id] ?? null,
    }));
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subscriptionId: string; immediate: boolean; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const patch: any = {
      auto_renew: false,
      cancelled_at: new Date().toISOString(),
    };
    if (data.immediate) {
      patch.status = "cancelled";
      patch.current_period_end = new Date().toISOString();
    }
    const { error } = await supabase
      .from("subscriptions")
      .update(patch)
      .eq("id", data.subscriptionId);
    if (error) throw new Error(error.message);
    await logAudit(
      supabase,
      userId,
      data.immediate ? "subscription.cancelled_now" : "subscription.autorenew_off",
      "subscriptions",
      data.subscriptionId,
      { reason: data.reason },
    );
    return { ok: true };
  });

// ============ PROMOTIONS ============
export const listAdminPromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("promotions")
      .select(
        "id, creator_id, name, status, discount_pct, promo_price, max_subscriptions, subscriptions_used, starts_at, ends_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status as any);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const profs = await hydrateProfiles(supabase, (rows ?? []).map((r: any) => r.creator_id));
    return (rows ?? []).map((r: any) => ({ ...r, creator: profs[r.creator_id] ?? null }));
  });

export const updatePromotionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { promotionId: string; status: "active" | "paused" | "ended"; reason?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("promotions")
      .update({ status: data.status })
      .eq("id", data.promotionId);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, `promotion.${data.status}`, "promotions", data.promotionId, {
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

// ============ TROPHIES ============
export const listAdminTrophies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("trophy_requests")
      .select("id, user_id, milestone_cents, status, admin_notes, resolved_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const profs = await hydrateProfiles(supabase, (rows ?? []).map((r: any) => r.user_id));
    return (rows ?? []).map((r: any) => ({ ...r, user: profs[r.user_id] ?? null }));
  });

export const resolveTrophy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      trophyId: string;
      status: "approved" | "rejected" | "shipped" | "delivered";
      notes?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("trophy_requests")
      .update({
        status: data.status,
        admin_notes: data.notes ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.trophyId);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, `trophy.${data.status}`, "trophy_requests", data.trophyId, {
      notes: data.notes ?? null,
    });
    return { ok: true };
  });

// ============ FINANCE — Asaas / Payment intents ============
export const listAsaasEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { onlyUnprocessed?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("asaas_events")
      .select("id, event_id, event_type, processed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.onlyUnprocessed) q = q.is("processed_at", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listPaymentIntents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { onlyPending?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("payment_intents")
      .select(
        "id, provider, event_id, event_type, method, transaction_id, processed_at, created_at, asaas_payment_id",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.onlyPending) q = q.is("processed_at", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ PLATFORM SETTINGS ============
export const getPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Record<string, any>) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const patch: Record<string, any> = {
      ...data,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    delete patch.id;
    const { error } = await supabase
      .from("platform_settings")
      .update(patch)
      .eq("id", true);
    if (error) throw new Error(error.message);
    await logAudit(supabase, userId, "platform_settings.updated", "platform_settings", null, patch);
    return { ok: true };
  });
