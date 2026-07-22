import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ChatCallInvite, ChatMessage, ChatPaidUploadMeta, ChatTipMeta, ChatWelcomeMedia } from "@/lib/chat.functions";

const MIN_TIP_CENTS = 500;
const MAX_TIP_CENTS = 200_000;
const MIN_CALL_CENTS = 3_990;
const MAX_CALL_CENTS = 500_000;
const MIN_DM_CENTS = 1_490;
const MAX_DM_CENTS = 200_000;
const INVITE_TTL_MIN = 10;

function nowIso() {
  return new Date().toISOString();
}

function getThreadPartner(supabase: any, userId: string, threadId: string) {
  return supabase
    .from("chat_threads")
    .select("id, user_a, user_b")
    .eq("id", threadId)
    .maybeSingle();
}

async function partnerIdOf(
  supabase: any,
  userId: string,
  threadId: string,
): Promise<string> {
  const { data: t, error } = await getThreadPartner(supabase, userId, threadId);
  if (error) throw new Error(error.message);
  if (!t) throw new Error("Conversa não encontrada");
  if (t.user_a !== userId && t.user_b !== userId) {
    throw new Error("Sem acesso a esta conversa");
  }
  return t.user_a === userId ? t.user_b : t.user_a;
}

async function insertSystemMessage(
  supabase: any,
  threadId: string,
  senderId: string,
  content: string,
  metadata: Record<string, unknown>,
): Promise<ChatMessage> {
  const { data: row, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      content,
      price_cents: 0,
      metadata: metadata as unknown as never,
    })
    .select("id, thread_id, sender_id, content, read_at, created_at, price_cents, metadata")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    content: row.content,
    readAt: row.read_at,
    createdAt: row.created_at,
    priceCents: row.price_cents ?? 0,
    unlocked: true,
    metadata: (row.metadata ?? null) as ChatMessage["metadata"],
  };
}

// ---- Video call invite (creator → subscriber, 10-min expiry) ----

export const createCallInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
        priceCents: z.number().int().min(MIN_CALL_CENTS).max(MAX_CALL_CENTS),
        durationMinutes: z.number().int().min(5).max(120).default(15),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ callId: string; messageId: string }> => {
    const { supabase, userId } = context;
    const partnerId = await partnerIdOf(supabase, userId, data.threadId);

    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (me?.account_type !== "creator" && me?.account_type !== "free_creator") {
      throw new Error("Apenas criadores podem enviar convites de videochamada");
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_MIN * 60 * 1000).toISOString();

    const { data: call, error: cErr } = await supabase
      .from("video_calls")
      .insert({
        requester_id: partnerId,
        creator_id: userId,
        price_cents: data.priceCents,
        duration_minutes: data.durationMinutes,
        status: "pending_payment",
        payment_status: "pending",
        provider: "manual",
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (cErr) throw new Error(cErr.message);

    const meta: { callInvite: ChatCallInvite } = {
      callInvite: {
        callId: call.id,
        priceCents: data.priceCents,
        durationMin: data.durationMinutes,
        expiresAt,
        status: "pending_payment",
      },
    };
    const msg = await insertSystemMessage(
      supabase,
      data.threadId,
      userId,
      `Convite de videochamada de ${data.durationMinutes} min`,
      meta as unknown as Record<string, unknown>,
    );
    return { callId: call.id, messageId: msg.id };
  });

export const cancelCallInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ callId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { data: call, error } = await supabase
      .from("video_calls")
      .select("id, creator_id, status, payment_status")
      .eq("id", data.callId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!call) throw new Error("Convite não encontrado");
    if (call.creator_id !== userId) throw new Error("Sem permissão");
    if (call.status !== "pending_payment" || call.payment_status === "paid") {
      throw new Error("Convite não pode mais ser cancelado");
    }
    const { error: uErr } = await supabase
      .from("video_calls")
      .update({ status: "cancelled", updated_at: nowIso() })
      .eq("id", data.callId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true as const };
  });

export const expireStaleInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ threadId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const partnerId = await partnerIdOf(supabase, userId, data.threadId);
    const { error } = await supabase
      .from("video_calls")
      .update({ status: "expired", updated_at: nowIso() })
      .eq("status", "pending_payment")
      .lt("expires_at", nowIso())
      .or(`and(creator_id.eq.${userId},requester_id.eq.${partnerId}),and(creator_id.eq.${partnerId},requester_id.eq.${userId})`);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Tip / Mimo inside chat ----

export const sendTipMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
        amountCents: z.number().int().min(MIN_TIP_CENTS).max(MAX_TIP_CENTS),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ messageId: string; tipId: string }> => {
    const { supabase, userId } = context;
    const partnerId = await partnerIdOf(supabase, userId, data.threadId);
    if (partnerId === userId) throw new Error("Não pode enviar Mimo para si mesmo");

    const { data: tip, error } = await supabase
      .from("tips")
      .insert({
        creator_id: partnerId,
        sender_id: userId,
        amount_cents: data.amountCents,
        provider: "wallet",
        status: "paid",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const meta: { tip: ChatTipMeta } = {
      tip: { tipId: tip.id, amountCents: data.amountCents },
    };
    const msg = await insertSystemMessage(
      supabase,
      data.threadId,
      userId,
      `Mimo de ${(data.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      meta as unknown as Record<string, unknown>,
    );
    return { messageId: msg.id, tipId: tip.id };
  });

// ---- Paid DM upload (subscriber pays to send media to creator) ----

export const createPaidDmRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
        priceCents: z.number().int().min(MIN_DM_CENTS).max(MAX_DM_CENTS),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ requestId: string }> => {
    const { supabase, userId } = context;
    const creatorId = await partnerIdOf(supabase, userId, data.threadId);
    if (creatorId === userId) throw new Error("Não pode solicitar envio pago para si mesmo");

    const { data: creator, error: cErr } = await supabase
      .from("profiles")
      .select("paid_dm_upload_enabled, paid_dm_upload_min_cents, paid_dm_upload_max_cents")
      .eq("user_id", creatorId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!creator?.paid_dm_upload_enabled) throw new Error("Criador não aceita envio pago de mídia");
    if (
      data.priceCents < (creator.paid_dm_upload_min_cents ?? MIN_DM_CENTS) ||
      data.priceCents > (creator.paid_dm_upload_max_cents ?? MAX_DM_CENTS)
    ) {
      throw new Error("Valor fora da faixa permitida pelo criador");
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: req, error } = await supabase
      .from("chat_media_requests")
      .insert({
        thread_id: data.threadId,
        requester_id: userId,
        creator_id: creatorId,
        price_cents: data.priceCents,
        status: "pending_payment",
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { requestId: req.id };
  });

export const cancelPaidDmRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { data: req, error } = await supabase
      .from("chat_media_requests")
      .select("id, requester_id, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Solicitação não encontrada");
    if (req.requester_id !== userId) throw new Error("Sem permissão");
    if (req.status !== "pending_payment") throw new Error("Solicitação não pode ser cancelada");
    const { error: uErr } = await supabase
      .from("chat_media_requests")
      .update({ status: "cancelled", updated_at: nowIso() })
      .eq("id", data.requestId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true as const };
  });

export const markPaidDmDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        media: z.array(
          z.object({
            path: z.string().min(1),
            mime: z.string().min(1),
            kind: z.enum(["image", "video", "audio"]),
            durationSec: z.number().int().positive().optional(),
          }),
        ),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ messageId: string }> => {
    const { supabase, userId } = context;
    const { data: req, error } = await supabase
      .from("chat_media_requests")
      .select("id, requester_id, creator_id, thread_id, status, price_cents")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Solicitação não encontrada");
    if (req.requester_id !== userId) throw new Error("Sem permissão");
    if (req.status !== "paid") throw new Error("Solicitação não está paga");

    const { error: uErr } = await supabase
      .from("chat_media_requests")
      .update({
        status: "delivered",
        media: data.media as unknown as never,
        delivered_at: nowIso(),
      })
      .eq("id", data.requestId);
    if (uErr) throw new Error(uErr.message);

    // Sign URLs for immediate rendering
    const { data: signed } = await supabase.storage
      .from("chat-paid-uploads")
      .createSignedUrls(data.media.map((m) => m.path), 60 * 60);
    const urlByPath = new Map<string, string>();
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);

    const mediaWithUrls: ChatWelcomeMedia[] = data.media.map((m) => ({
      path: m.path,
      mime: m.mime,
      kind: m.kind,
      durationSec: m.durationSec ?? null,
      url: urlByPath.get(m.path) ?? null,
    }));

    const meta: { paidUpload: ChatPaidUploadMeta; media: ChatWelcomeMedia[] } = {
      paidUpload: { requestId: req.id, priceCents: req.price_cents },
      media: mediaWithUrls,
    };
    const msg = await insertSystemMessage(
      supabase,
      req.thread_id,
      userId,
      "",
      meta as unknown as Record<string, unknown>,
    );
    return { messageId: msg.id };
  });

// ---- Broadcast (mass message) ----

export const previewBroadcastAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        audience: z.enum(["all_followers", "active_subscribers", "expired_subscribers", "top_buyers"]),
        creatorId: z.string().uuid(),
        topN: z.number().int().min(1).max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ count: number; sample: string[] }> => {
    const { supabase, userId } = context;
    if (data.creatorId !== userId) throw new Error("Sem permissão");

    let query = supabase.from("follows").select("follower_id").eq("followee_id", userId);

    if (data.audience === "active_subscribers") {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("subscriber_id")
        .eq("creator_id", userId)
        .eq("status", "active")
        .gt("current_period_end", nowIso());
      const ids = Array.from(new Set((subs ?? []).map((s) => s.subscriber_id)));
      return { count: ids.length, sample: ids.slice(0, 5) };
    }

    if (data.audience === "expired_subscribers") {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("subscriber_id, current_period_end")
        .eq("creator_id", userId)
        .neq("status", "active")
        .or(`current_period_end.lt.${nowIso()},status.eq.cancelled`)
        .limit(1000);
      const ids = Array.from(new Set((subs ?? []).map((s) => s.subscriber_id)));
      return { count: ids.length, sample: ids.slice(0, 5) };
    }

    if (data.audience === "top_buyers") {
      const { data: txs } = await supabase
        .from("transactions")
        .select("buyer_id, amount_cents_gross")
        .eq("creator_id", userId)
        .eq("status", "paid")
        .in("kind", ["publication_unlock", "chat_unlock", "subscription", "tip", "video_call"])
        .limit(1000);
      const grossByBuyer = new Map<string, number>();
      for (const t of txs ?? []) {
        grossByBuyer.set(t.buyer_id, (grossByBuyer.get(t.buyer_id) ?? 0) + (t.amount_cents_gross ?? 0));
      }
      const sorted = Array.from(grossByBuyer.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, data.topN ?? 100)
        .map(([id]) => id);
      return { count: sorted.length, sample: sorted.slice(0, 5) };
    }

    const { data: rows, error } = await query.limit(1000);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.follower_id)));
    return { count: ids.length, sample: ids.slice(0, 5) };
  });

export const sendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        audience: z.enum(["all_followers", "active_subscribers", "expired_subscribers", "top_buyers"]),
        message: z.string().min(1).max(4000),
        media: z
          .array(
            z.object({
              path: z.string().min(1),
              mime: z.string().min(1),
              kind: z.enum(["image", "video", "audio"]),
              durationSec: z.number().int().positive().optional(),
            }),
          )
          .max(10)
          .default([]),
        priceCents: z.number().int().min(0).max(50000).default(0),
        topN: z.number().int().min(1).max(500).optional(),
      })
      .refine((v) => v.priceCents === 0 || v.media.length > 0, {
        message: "Anexe uma mídia para definir um preço",
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ sent: number; failed: number; jobId: string }> => {
    const { supabase, userId } = context;

    const { data: me } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", userId)
      .maybeSingle();
    if (me?.account_type !== "creator" && me?.account_type !== "free_creator") {
      throw new Error("Apenas criadores podem enviar broadcasts");
    }

    let recipientIds: string[] = [];
    if (data.audience === "active_subscribers") {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("subscriber_id")
        .eq("creator_id", userId)
        .eq("status", "active")
        .gt("current_period_end", nowIso())
        .limit(500);
      recipientIds = Array.from(new Set((subs ?? []).map((s) => s.subscriber_id)));
    } else if (data.audience === "expired_subscribers") {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("subscriber_id")
        .eq("creator_id", userId)
        .or(`current_period_end.lt.${nowIso()},status.eq.cancelled`)
        .limit(500);
      recipientIds = Array.from(new Set((subs ?? []).map((s) => s.subscriber_id)));
    } else if (data.audience === "top_buyers") {
      const { data: txs } = await supabase
        .from("transactions")
        .select("buyer_id, amount_cents_gross")
        .eq("creator_id", userId)
        .eq("status", "paid")
        .in("kind", ["publication_unlock", "chat_unlock", "subscription", "tip", "video_call"])
        .limit(1000);
      const grossByBuyer = new Map<string, number>();
      for (const t of txs ?? []) {
        grossByBuyer.set(t.buyer_id, (grossByBuyer.get(t.buyer_id) ?? 0) + (t.amount_cents_gross ?? 0));
      }
      recipientIds = Array.from(grossByBuyer.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, data.topN ?? 100)
        .map(([id]) => id);
    } else {
      const { data: rows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId)
        .limit(500);
      recipientIds = Array.from(new Set((rows ?? []).map((r) => r.follower_id)));
    }

    recipientIds = recipientIds.filter((id) => id !== userId).slice(0, 500);

    const { data: job, error: jErr } = await supabase
      .from("broadcast_jobs")
      .insert({
        creator_id: userId,
        audience: data.audience,
        filters: { topN: data.topN } as unknown as never,
        message: data.message,
        media: data.media as unknown as never,
        price_cents: data.priceCents,
        total_recipients: recipientIds.length,
        status: "running",
      })
      .select("id")
      .single();
    if (jErr) throw new Error(jErr.message);

    let sent = 0;
    let failed = 0;
    for (const recipientId of recipientIds) {
      try {
        const { data: threadId, error: tErr } = await supabase.rpc("get_or_create_thread", {
          other_user: recipientId,
        });
        if (tErr || !threadId) {
          failed++;
          continue;
        }
        const { error: mErr } = await supabase.from("chat_messages").insert({
          thread_id: threadId as string,
          sender_id: userId,
          content: data.message,
          price_cents: data.priceCents,
          metadata: data.media.length > 0 ? ({ media: data.media } as unknown as never) : ({} as unknown as never),
        });
        if (mErr) {
          failed++;
          continue;
        }
        sent++;
      } catch {
        failed++;
      }
    }

    await supabase
      .from("broadcast_jobs")
      .update({
        status: "completed",
        sent_count: sent,
        failed_count: failed,
      })
      .eq("id", job.id);

    return { sent, failed, jobId: job.id };
  });
