import { createServerFn } from "@tanstack/react-start";
import { adminDb } from "@/lib/admin-db";
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
    const { data: rows, error } = await (supabase as any)
      .from("chat_messages_safe")
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
    // Mensagem paga só pelo fluxo com mídia (chat.functions sendMessage).
    if ((data.priceCents ?? 0) > 0) throw new Error("mensagem paga precisa de mídia");
    const priceCents = 0;
    const { data: row, error } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: data.threadId,
        sender_id: userId,
        content: content.slice(0, 4000),
        price_cents: priceCents,
      })
      .select("id, thread_id, sender_id, price_cents, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, content: content.slice(0, 4000) };
  });

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

    // Preço e duração vêm só do banco (configuração do creator).
    const duration = Math.max(1, Math.floor(creator.video_call_default_minutes ?? 15));
    const price = Math.max(0, Math.floor(creator.video_call_price_cents ?? 0));
    const db = await adminDb();

    if (price <= 0) {
      const { data: row, error } = await db
        .from("video_calls")
        .insert({
          requester_id: userId,
          creator_id: data.creatorId,
          duration_minutes: duration,
          price_cents: 0,
          status: "accepted",
          payment_status: "paid",
          provider: "daily",
        })
        .select("id, status, payment_status, duration_minutes, price_cents")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }

    const { data: pending, error: insErr } = await db
      .from("video_calls")
      .insert({
        requester_id: userId,
        creator_id: data.creatorId,
        duration_minutes: duration,
        price_cents: price,
        status: "pending_payment",
        payment_status: "pending",
        provider: "daily",
      })
      .select("id")
      .single();
    if (insErr || !pending) throw new Error(insErr?.message ?? "falha ao criar chamada");

    // Débito atômico (trava o saldo), transação e crédito ao creator ficam no banco.
    // Todos os 12 argumentos nomeados → resolve só a versão mais nova
    // pay_with_wallet(text,uuid,uuid,uuid,text,integer,text,uuid,uuid,uuid,uuid,uuid).
    const { error: payErr } = await (supabase as any).rpc("pay_with_wallet", {
      _kind: "video_call",
      _publication_id: null,
      _message_id: null,
      _creator_id: data.creatorId,
      _plan: null,
      _amount_cents: price,
      _message: null,
      _story_id: null,
      _call_id: pending.id,
      _request_id: null,
      _creator_profile_id: null,
      _live_id: null,
    });
    if (payErr) {
      await db
        .from("video_calls")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", pending.id)
        .eq("status", "pending_payment");
      if (/insufficient/i.test(payErr.message ?? "")) throw new Error("insufficient_wallet_balance");
      throw new Error(payErr.message ?? "falha no pagamento");
    }
    // pay_with_wallet marca payment_status = paid; a chamada passa a aceita.
    await db
      .from("video_calls")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", pending.id)
      .eq("payment_status", "paid");

    const { data: row, error } = await db
      .from("video_calls")
      .select("id, status, payment_status, duration_minutes, price_cents")
      .eq("id", pending.id)
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
    if (call.status !== "requested") throw new Error("call can no longer be answered");

    const { data: row, error } = await (await adminDb())
      .from("video_calls")
      .update({ status: data.accept ? "accepted" : "declined" })
      .eq("id", data.callId)
      .select("id, status")
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
    const { data: row, error } = await (await adminDb())
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
      await (await adminDb())
        .from("video_calls")
        .update({
          room_url: roomUrl,
          started_at: call.started_at ?? new Date().toISOString(),
        })
        .eq("id", call.id);
    } else if (!call.started_at) {
      await (await adminDb())
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
    const { error } = await (await adminDb())
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
