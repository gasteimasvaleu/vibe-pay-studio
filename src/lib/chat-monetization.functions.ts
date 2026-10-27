import { createServerFn } from "@tanstack/react-start";
import { adminDb } from "@/lib/admin-db";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActiveProfileIdFor } from "@/lib/profile-active.server";
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
  void supabase;
  // Mensagens com cartões/mídia só são gravadas pelo servidor.
  const { data: row, error } = await (await adminDb())
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
      .from("profiles_public")
      .select("account_type")
      .eq("user_id", userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (me?.account_type !== "creator" && me?.account_type !== "free_creator") {
      throw new Error("Apenas criadores podem enviar convites de videochamada");
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_MIN * 60 * 1000).toISOString();
    const activeProfileId = await getActiveProfileIdFor(supabase, userId);

    const { data: call, error: cErr } = await (await adminDb())
      .from("video_calls")
      .insert({
        requester_id: partnerId,
        creator_id: userId,
        creator_profile_id: activeProfileId,
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
    const { error: uErr } = await (await adminDb())
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
    const { error } = await (await adminDb())
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

    const creatorActiveProfileId = await getActiveProfileIdFor(supabase, partnerId);
    const { data: walletResult, error: rpcErr } = await supabase.rpc("pay_with_wallet", {
      _kind: "tip",
      _creator_id: partnerId,
      _amount_cents: data.amountCents,
      _creator_profile_id: creatorActiveProfileId,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    const tipId = (walletResult as { referenceId?: string } | null)?.referenceId;
    if (!tipId) throw new Error("Falha ao processar mimo");

    const meta: { tip: ChatTipMeta } = {
      tip: { tipId, amountCents: data.amountCents },
    };
    const msg = await insertSystemMessage(
      supabase,
      data.threadId,
      userId,
      `Mimo de ${(data.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      meta as unknown as Record<string, unknown>,
    );
    return { messageId: msg.id, tipId };
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
      .from("profiles_public")
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
    const creatorActiveProfileId = await getActiveProfileIdFor(supabase, creatorId);
    const { data: req, error } = await (await adminDb())
      .from("chat_media_requests")
      .insert({
        thread_id: data.threadId,
        requester_id: userId,
        creator_id: creatorId,
        creator_profile_id: creatorActiveProfileId,
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
    const { error: uErr } = await (await adminDb())
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

    const { error: uErr } = await (await adminDb())
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

import {
  BROADCAST_AUDIENCES,
  resolveAudienceIds,
  type BroadcastAudience,
} from "@/lib/broadcast-audience.server";

function uiFilterToAudience(name: string): { audience: BroadcastAudience; topN?: number } | null {
  switch (name) {
    case "Todos":
    case "Seguidores":
      return { audience: "all_followers" };
    case "Seguindo":
      return { audience: "all_following" };
    case "Expirados":
      return { audience: "expired_subscribers" };
    case "Expiram em 7 Dias":
      return { audience: "expiring_7d" };
    case "Interações":
      return { audience: "recent_interactors" };
    case "Top 100 Compradores":
      return { audience: "top_buyers", topN: 100 };
    case "Top 1000 Compradores":
      return { audience: "top_buyers", topN: 1000 };
    default:
      return null;
  }
}


export const previewBroadcastAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        filters: z.array(z.string()).min(1).max(10),
        creatorId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ count: number; sample: string[] }> => {
    const { supabase, userId } = context;
    if (data.creatorId !== userId) throw new Error("Sem permissão");

    const resolved = data.filters.map(uiFilterToAudience).filter(Boolean) as {
      audience: BroadcastAudience;
      topN?: number;
    }[];

    if (resolved.length === 0) throw new Error("Nenhum filtro válido");

    const ids = new Set<string>();
    for (const r of resolved) {
      const list = await resolveAudienceIds(supabase, userId, r.audience, r.topN);
      for (const id of list) ids.add(id);
    }

    const list = Array.from(ids).filter((id) => id !== userId).slice(0, 1000);
    return { count: list.length, sample: list.slice(0, 5) };
  });


export const sendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        filters: z.array(z.string()).min(1).max(10),
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
        scheduledAt: z.string().datetime().optional(),
      })
      .refine((v) => v.priceCents === 0 || v.media.length > 0, {
        message: "Anexe uma mídia para definir um preço",
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ sent: number; failed: number; jobId: string; scheduled: boolean; scheduledAt?: string }> => {
    const { supabase, userId } = context;

    const { data: me } = await supabase
      .from("profiles_public")
      .select("account_type")
      .eq("user_id", userId)
      .maybeSingle();
    if (me?.account_type !== "creator" && me?.account_type !== "free_creator") {
      throw new Error("Apenas criadores podem enviar broadcasts");
    }

    const resolved = data.filters.map(uiFilterToAudience).filter(Boolean) as {
      audience: BroadcastAudience;
      topN?: number;
    }[];

    if (resolved.length === 0) throw new Error("Nenhum filtro válido");

    const ids = new Set<string>();
    for (const r of resolved) {
      const list = await resolveAudienceIds(supabase, userId, r.audience, r.topN);
      for (const id of list) ids.add(id);
    }
    const recipientIds = Array.from(ids).filter((id) => id !== userId).slice(0, 1000);

    const audienceValues = resolved.map((r) => r.audience);
    const primaryAudience = audienceValues[0];
    const activeProfileId = await getActiveProfileIdFor(supabase, userId);
    const { data: job, error: jErr } = await supabase
      .from("broadcast_jobs")
      .insert({
        creator_id: userId,
        creator_profile_id: activeProfileId,
        audience: primaryAudience,
        filters: { audiences: resolved } as unknown as never,
        message: data.message,
        media: data.media as unknown as never,
        price_cents: data.priceCents,
        total_recipients: recipientIds.length,
        status: data.scheduledAt ? "scheduled" : "running",
        scheduled_at: data.scheduledAt ?? null,
      })
      .select("id")
      .single();
    if (jErr) throw new Error(jErr.message);

    if (data.scheduledAt) {
      return { sent: 0, failed: 0, jobId: job.id, scheduled: true, scheduledAt: data.scheduledAt };
    }


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
        // Stamp sender-side persona on the thread (best-effort).
        if (activeProfileId) {
          const { data: tRow } = await supabase
            .from("chat_threads")
            .select("user_a, user_a_profile_id, user_b_profile_id")
            .eq("id", threadId as string)
            .maybeSingle();
          if (tRow) {
            const patch: { user_a_profile_id?: string; user_b_profile_id?: string } = {};
            if (tRow.user_a === userId && !tRow.user_a_profile_id) patch.user_a_profile_id = activeProfileId;
            if (tRow.user_a !== userId && !tRow.user_b_profile_id) patch.user_b_profile_id = activeProfileId;
            if (Object.keys(patch).length) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from("chat_threads") as any).update(patch).eq("id", threadId as string);
            }
          }
        }
        const { error: mErr } = await (await adminDb()).from("chat_messages").insert({
          thread_id: threadId as string,
          sender_id: userId,
          creator_profile_id: activeProfileId,
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

    return { sent, failed, jobId: job.id, scheduled: false };
  });

export const scheduleBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        filters: z.array(z.string()).min(1).max(10),
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
        scheduledAt: z.string().datetime(),
      })
      .refine((v) => v.priceCents === 0 || v.media.length > 0, {
        message: "Anexe uma mídia para definir um preço",
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ jobId: string; totalRecipients: number }> => {
    const result = await sendBroadcast({ data: { ...data, scheduledAt: data.scheduledAt } });
    return { jobId: result.jobId, totalRecipients: result.sent + result.failed };
  });

export const listScheduledBroadcastsByMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ jobs: Array<{ id: string; scheduledAt: string | null; status: string; message: string; totalRecipients: number }> }> => {

    const { supabase, userId } = context;
    const start = new Date(Date.UTC(data.year, data.month - 1, 1)).toISOString();
    const end = new Date(Date.UTC(data.year, data.month, 1)).toISOString();

    const { data: jobs, error } = await supabase
      .from("broadcast_jobs")
      .select("id, scheduled_at, status, message, total_recipients")
      .eq("creator_id", userId)
      .gte("scheduled_at", start)
      .lt("scheduled_at", end)
      .order("scheduled_at", { ascending: true });
    if (error) throw new Error(error.message);

    return {
      jobs: (jobs ?? []).map((j) => ({
        id: j.id,
        scheduledAt: j.scheduled_at,
        status: j.status,
        message: j.message,
        totalRecipients: j.total_recipients ?? 0,
      })),
    };
  });

export const cancelBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        jobId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("broadcast_jobs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", data.jobId)
      .eq("creator_id", userId)
      .eq("status", "scheduled");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

