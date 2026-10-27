import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Chat ----

export const openThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { otherUserId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: threadId, error } = await supabase.rpc("get_or_create_thread", {
      other_user: data.otherUserId,
    });
    if (error) throw new Error(error.message);
    return { threadId: threadId as string };
  });

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("chat_threads")
      .select("id, user_a, user_b, last_message_at, created_at")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId: string; limit?: number }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("chat_messages")
      .select("id, thread_id, sender_id, content, price_cents, read_at, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true })
      .limit(data.limit ?? 200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { threadId: string; content: string; priceCents?: number }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const content = data.content.trim();
    if (!content) throw new Error("empty message");
    const priceCents = Math.max(0, Math.floor(data.priceCents ?? 0));
    const { data: row, error } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: data.threadId,
        sender_id: userId,
        content: content.slice(0, 4000),
        price_cents: priceCents,
      })
      .select("id, thread_id, sender_id, content, price_cents, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const unlockChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { messageId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: msg, error: msgErr } = await supabase
      .from("chat_messages")
      .select("id, sender_id, price_cents")
      .eq("id", data.messageId)
      .single();
    if (msgErr || !msg) throw new Error("message not found");
    if (msg.sender_id === userId) throw new Error("cannot unlock own message");
    if (!msg.price_cents || msg.price_cents <= 0) throw new Error("message is free");

    const { data: row, error } = await supabase
      .from("chat_message_unlocks")
      .insert({
        message_id: msg.id,
        buyer_id: userId,
        creator_id: msg.sender_id,
        amount_cents: msg.price_cents,
        status: "paid",
        provider: "manual",
      })
      .select("id, status, transaction_id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---- Video Calls ----

export const requestVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      creatorId: string;
      scheduledAt?: string;
      durationMinutes?: number;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.creatorId === userId) throw new Error("cannot call self");

    const { data: creator, error: cErr } = await supabase
      .from("profiles_public")
      .select(
        "user_id, video_call_enabled, video_call_price_cents, video_call_default_minutes",
      )
      .eq("user_id", data.creatorId)
      .single();
    if (cErr || !creator) throw new Error("creator not found");
    if (!creator.video_call_enabled) throw new Error("creator does not accept video calls");

    const duration = Math.max(1, Math.floor(data.durationMinutes ?? creator.video_call_default_minutes ?? 15));
    const price = Math.max(0, Math.floor(creator.video_call_price_cents ?? 0));

    const { data: row, error } = await supabase
      .from("video_calls")
      .insert({
        requester_id: userId,
        creator_id: data.creatorId,
        scheduled_at: data.scheduledAt ?? null,
        duration_minutes: duration,
        price_cents: price,
        status: "requested",
        payment_status: "pending",
        provider: "manual",
        notes: data.notes?.slice(0, 1000) ?? null,
      })
      .select("id, status, payment_status, price_cents, duration_minutes, scheduled_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const respondVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string; accept: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: call, error: cErr } = await supabase
      .from("video_calls")
      .select("id, creator_id, status")
      .eq("id", data.callId)
      .single();
    if (cErr || !call) throw new Error("call not found");
    if (call.creator_id !== userId) throw new Error("only creator can respond");

    const { data: row, error } = await supabase
      .from("video_calls")
      .update({ status: data.accept ? "accepted" : "declined" })
      .eq("id", data.callId)
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const payVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string; roomUrl?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: call, error: cErr } = await supabase
      .from("video_calls")
      .select("id, requester_id, payment_status, status")
      .eq("id", data.callId)
      .single();
    if (cErr || !call) throw new Error("call not found");
    if (call.requester_id !== userId) throw new Error("only requester can pay");
    if (call.payment_status === "paid") throw new Error("already paid");

    const { data: row, error } = await supabase
      .from("video_calls")
      .update({ payment_status: "paid", room_url: data.roomUrl ?? null })
      .eq("id", data.callId)
      .select("id, payment_status, room_url, transaction_id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const completeVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: call, error: cErr } = await supabase
      .from("video_calls")
      .select("id, requester_id, creator_id, started_at")
      .eq("id", data.callId)
      .single();
    if (cErr || !call) throw new Error("call not found");
    if (call.requester_id !== userId && call.creator_id !== userId)
      throw new Error("not a participant");

    const nowIso = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("video_calls")
      .update({
        status: "completed",
        started_at: call.started_at ?? nowIso,
        ended_at: nowIso,
      })
      .eq("id", data.callId)
      .select("id, status, started_at, ended_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listVideoCalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("video_calls")
      .select(
        "id, requester_id, creator_id, status, payment_status, price_cents, duration_minutes, scheduled_at, started_at, ended_at, room_url, created_at",
      )
      .or(`requester_id.eq.${userId},creator_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Subscriber creates + pays a 1:1 video call using their prepaid wallet.
 * Simplification vs request/respond flow: one atomic step.
 * - Validates creator settings and requester wallet balance
 * - Debits subscriber_wallets, marks call as accepted+paid
 * - Room is created on first join (see joinVideoCall)
 */
export const startPaidVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { creatorId: string; durationMinutes?: number }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.creatorId === userId) throw new Error("cannot call self");

    const { data: creator, error: cErr } = await supabase
      .from("profiles_public")
      .select("user_id, username, video_call_enabled, video_call_price_cents, video_call_default_minutes")
      .eq("user_id", data.creatorId)
      .single();
    if (cErr || !creator) throw new Error("creator not found");
    if (!creator.video_call_enabled) throw new Error("creator does not accept video calls");

    const duration = Math.max(1, Math.floor(data.durationMinutes ?? creator.video_call_default_minutes ?? 15));
    const price = Math.max(0, Math.floor(creator.video_call_price_cents ?? 0));

    if (price > 0) {
      const { data: wallet, error: wErr } = await supabase
        .from("subscriber_wallets")
        .select("balance_cents")
        .eq("user_id", userId)
        .maybeSingle();
      if (wErr) throw new Error(wErr.message);
      const balance = wallet?.balance_cents ?? 0;
      if (balance < price) throw new Error("insufficient_wallet_balance");

      const { error: dErr } = await supabase
        .from("subscriber_wallets")
        .update({ balance_cents: balance - price, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (dErr) throw new Error(dErr.message);
    }

    const { data: row, error } = await supabase
      .from("video_calls")
      .insert({
        requester_id: userId,
        creator_id: data.creatorId,
        duration_minutes: duration,
        price_cents: price,
        status: "accepted",
        payment_status: price > 0 ? "paid" : "paid",
        provider: "daily",
      })
      .select("id, status, payment_status, duration_minutes, price_cents")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/**
 * Either participant fetches join credentials. On first call, a Daily room is
 * provisioned and its URL persisted. Returns { roomUrl, token } for the daily-js SDK.
 */
export const joinVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: call, error: cErr } = await supabase
      .from("video_calls")
      .select("id, requester_id, creator_id, status, payment_status, room_url, duration_minutes, started_at")
      .eq("id", data.callId)
      .single();
    if (cErr || !call) throw new Error("call not found");
    if (call.requester_id !== userId && call.creator_id !== userId)
      throw new Error("not a participant");
    if (call.status === "completed" || call.status === "cancelled" || call.status === "declined")
      throw new Error("call is not active");
    if (call.payment_status !== "paid")
      throw new Error("call is not paid");

    const { dailyEnsureRoom, dailyCreateToken } = await import("./video-calls.server");
    const isCreator = call.creator_id === userId;

    // Room lifetime = duration + 10 min buffer, min 20 min.
    const expSeconds = Math.max(20, (call.duration_minutes ?? 15) + 10) * 60;
    let roomUrl = call.room_url;
    let roomName = roomUrl ? roomUrl.split("/").pop()! : `call-${call.id}`.slice(0, 40);

    if (!roomUrl) {
      const room = await dailyEnsureRoom(call.id, expSeconds);
      roomUrl = room.url;
      roomName = room.name;
      await supabase
        .from("video_calls")
        .update({
          room_url: roomUrl,
          started_at: call.started_at ?? new Date().toISOString(),
        })
        .eq("id", call.id);
    } else if (!call.started_at) {
      await supabase
        .from("video_calls")
        .update({ started_at: new Date().toISOString() })
        .eq("id", call.id);
    }

    // Get participant display name.
    const { data: me } = await supabase
      .from("profiles_public")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();

    const token = await dailyCreateToken({
      roomName,
      userName: me?.username ?? (isCreator ? "creator" : "guest"),
      userId,
      isOwner: isCreator,
      expSeconds,
    });

    return { roomUrl, token, isCreator };
  });

/**
 * Either party ends the call. Sets status=completed and ended_at=now.
 */
export const endVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: call, error: cErr } = await supabase
      .from("video_calls")
      .select("id, requester_id, creator_id, started_at, status")
      .eq("id", data.callId)
      .single();
    if (cErr || !call) throw new Error("call not found");
    if (call.requester_id !== userId && call.creator_id !== userId)
      throw new Error("not a participant");
    if (call.status === "completed") return { id: call.id, status: "completed" as const };

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("video_calls")
      .update({ status: "completed", started_at: call.started_at ?? now, ended_at: now })
      .eq("id", data.callId);
    if (error) throw new Error(error.message);
    return { id: call.id, status: "completed" as const };
  });

/**
 * List active/paid calls between the current user and a specific counterparty.
 * Used by the chat thread to render the "join call" banner.
 */
export const listActiveCallsWith = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { otherUserId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("video_calls")
      .select("id, requester_id, creator_id, status, payment_status, duration_minutes, price_cents, room_url, started_at, created_at")
      .in("status", ["requested", "accepted"])
      .or(
        `and(requester_id.eq.${userId},creator_id.eq.${data.otherUserId}),and(requester_id.eq.${data.otherUserId},creator_id.eq.${userId})`,
      )
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
