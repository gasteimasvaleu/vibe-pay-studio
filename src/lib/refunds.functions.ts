import { createServerFn } from "@tanstack/react-start";
import { adminDb } from "@/lib/admin-db";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RefundableItem = {
  id: string;
  referenceType: "publication_unlock" | "chat_message_unlock" | "subscription" | "tip";
  referenceId: string;
  amountCents: number;
  createdAt: string;
  status: "paid" | "active";
  transactionId?: string | null;
  asaasPaymentId?: string | null;
  creator?: {
    userId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  details?: {
    caption?: string | null;
    thumbUrl?: string | null;
    mediaType?: "image" | "video" | null;
    messagePreview?: string | null;
    plan?: string | null;
  } | null;
};

export type RefundRequestItem = {
  id: string;
  referenceType: string;
  referenceId: string;
  amountCents: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  creator?: {
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  details?: {
    caption?: string | null;
    thumbUrl?: string | null;
    mediaType?: "image" | "video" | null;
    messagePreview?: string | null;
    plan?: string | null;
  } | null;
};

const REFUND_WINDOW_DAYS = 7;

function withinRefundWindow(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const deadline = created + REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() <= deadline;
}

async function fetchAuthorsMap(client: any, ids: string[]) {
  if (ids.length === 0) return new Map<string, any>();
  const { data } = await client
    .from("profiles_public")
    .select("user_id, username, display_name, avatar_url")
    .in("user_id", ids);
  const m = new Map<string, any>();
  (data ?? []).forEach((p: any) => m.set(p.user_id as string, p));
  return m;
}

async function hydratePublications(client: any, pubIds: string[]) {
  if (pubIds.length === 0) {
    return { pubs: new Map<string, any>(), media: [] as any[] };
  }
  const [{ data: pubs }, { data: media }] = await Promise.all([
    client
      .from("publications")
      .select("id, author_id, caption, visibility, price_cents, preview_url, created_at")
      .in("id", pubIds),
    client
      .from("publication_media")
      .select("publication_id, url, type, position")
      .in("publication_id", pubIds)
      .order("position", { ascending: true }),
  ]);
  const pubMap = new Map<string, any>();
  (pubs ?? []).forEach((p: any) => pubMap.set(p.id as string, p));
  return { pubs: pubMap, media: (media ?? []) as any[] };
}

async function fetchTransactionsMap(client: any, ids: string[]) {
  if (ids.length === 0) return new Map<string, any>();
  const { data } = await client
    .from("transactions")
    .select("id, provider_ref")
    .in("id", ids);
  const m = new Map<string, any>();
  (data ?? []).forEach((t: any) => m.set(t.id as string, t));
  return m;
}

export const listMyRefundablePurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RefundableItem[]> => {
    const { supabase, userId } = context;

    const [{ data: pubUnlocks }, { data: chatUnlocks }, { data: subs }] = await Promise.all([
      supabase
        .from("publication_unlocks")
        .select("id, publication_id, amount_cents, created_at, status, transaction_id, provider_ref")
        .eq("buyer_id", userId)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("chat_message_unlocks")
        .select("id, message_id, creator_id, amount_cents, created_at, status, transaction_id, provider_ref")
        .eq("buyer_id", userId)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("subscriptions")
        .select("id, creator_id, plan, price_cents_paid, started_at, status, provider_ref")
        .eq("subscriber_id", userId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(200),
    ]);

    const pubIds = (pubUnlocks ?? []).map((r: any) => r.publication_id as string);
    const msgIds = (chatUnlocks ?? []).map((r: any) => r.message_id as string);
    const creatorIds = Array.from(
      new Set([
        ...(chatUnlocks ?? []).map((r: any) => r.creator_id as string),
        ...(subs ?? []).map((r: any) => r.creator_id as string),
      ]),
    );

    const [{ pubs, media }, { data: msgs }, authors] = await Promise.all([
      hydratePublications(supabase, pubIds),
      msgIds.length
        ? supabase.from("chat_messages").select("id, thread_id, content").in("id", msgIds)
        : Promise.resolve({ data: [] as any[] }),
      fetchAuthorsMap(supabase, creatorIds),
    ]);

    const allTxIds = Array.from(
      new Set(
        [
          ...(pubUnlocks ?? []).map((r: any) => r.transaction_id),
          ...(chatUnlocks ?? []).map((r: any) => r.transaction_id),
        ].filter(Boolean) as string[],
      ),
    );
    const txMap = await fetchTransactionsMap(supabase, allTxIds);

    const items: RefundableItem[] = [];

    for (const r of pubUnlocks ?? []) {
      const p = pubs.get(r.publication_id as string);
      const m = p ? media.find((x: any) => x.publication_id === p.id) : undefined;
      const author = p
        ? await fetchAuthorsMap(supabase, [p.author_id as string]).then((m) => m.get(p.author_id as string))
        : null;
      items.push({
        id: r.id as string,
        referenceType: "publication_unlock",
        referenceId: r.id as string,
        amountCents: Number(r.amount_cents),
        createdAt: r.created_at as string,
        status: r.status as string as "paid",
        transactionId: r.transaction_id as string | null,
        asaasPaymentId: (r.provider_ref as string | null) ?? txMap.get(r.transaction_id as string)?.provider_ref ?? null,
        creator: author
          ? {
              userId: author.user_id as string,
              username: author.username as string | null,
              displayName: author.display_name as string | null,
              avatarUrl: author.avatar_url as string | null,
            }
          : null,
        details: {
          caption: p?.caption as string | null,
          thumbUrl: (m?.url ?? p?.preview_url) as string | null,
          mediaType: (m?.type ?? null) as "image" | "video" | null,
        },
      });
    }

    for (const r of chatUnlocks ?? []) {
      const msg = (msgs ?? []).find((m: any) => m.id === r.message_id);
      const author = authors.get(r.creator_id as string);
      items.push({
        id: r.id as string,
        referenceType: "chat_message_unlock",
        referenceId: r.id as string,
        amountCents: Number(r.amount_cents),
        createdAt: r.created_at as string,
        status: r.status as string as "paid",
        transactionId: r.transaction_id as string | null,
        asaasPaymentId: (r.provider_ref as string | null) ?? txMap.get(r.transaction_id as string)?.provider_ref ?? null,
        creator: author
          ? {
              userId: author.user_id as string,
              username: author.username as string | null,
              displayName: author.display_name as string | null,
              avatarUrl: author.avatar_url as string | null,
            }
          : null,
        details: {
          messagePreview: msg?.content ? String(msg.content).slice(0, 120) : null,
        },
      });
    }

    for (const r of subs ?? []) {
      const author = authors.get(r.creator_id as string);
      items.push({
        id: r.id as string,
        referenceType: "subscription",
        referenceId: r.id as string,
        amountCents: Number(r.price_cents_paid),
        createdAt: r.started_at as string,
        status: "active",
        transactionId: null,
        asaasPaymentId: r.provider_ref as string | null,
        creator: author
          ? {
              userId: author.user_id as string,
              username: author.username as string | null,
              displayName: author.display_name as string | null,
              avatarUrl: author.avatar_url as string | null,
            }
          : null,
        details: {
          plan: r.plan as string,
        },
      });
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

export const requestRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      referenceType: "publication_unlock" | "chat_message_unlock" | "subscription" | "tip";
      referenceId: string;
      reason: string;
    }) => {
      if (!data.referenceType || !data.referenceId) throw new Error("dados incompletos");
      return {
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        reason: (data.reason ?? "").trim().slice(0, 2000),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const tableMap = {
      publication_unlock: "publication_unlocks",
      chat_message_unlock: "chat_message_unlocks",
      subscription: "subscriptions",
      tip: "tips",
    } as const;

    const table = tableMap[data.referenceType];

    const { data: row, error: rowError } = await (supabase as any)
      .from(table)
      .select("id, transaction_id, provider_ref, amount_cents, created_at, status")
      .eq("id", data.referenceId)
      .maybeSingle();

    if (rowError) throw new Error(rowError.message);
    if (!row) throw new Error("compra não encontrada");

    const ownerColumn =
      data.referenceType === "subscription"
        ? "subscriber_id"
        : data.referenceType === "tip"
          ? "sender_id"
          : "buyer_id";

    const { data: ownerCheck, error: ownerError } = await (supabase as any)
      .from(table)
      .select("id")
      .eq("id", data.referenceId)
      .eq(ownerColumn, userId)
      .maybeSingle();

    if (ownerError) throw new Error(ownerError.message);
    if (!ownerCheck) throw new Error("compra não pertence ao usuário");

    const eligibleStatus = data.referenceType === "subscription" ? "active" : "paid";
    if (row.status !== eligibleStatus) throw new Error("esta compra não está elegível para reembolso");

    if (!withinRefundWindow(row.created_at as string)) throw new Error("prazo de reembolso expirado");

    const { data: existing, error: existingError } = await supabase
      .from("refund_requests")
      .select("id, status")
      .eq("user_id", userId)
      .eq("reference_type", data.referenceType)
      .eq("reference_id", data.referenceId)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (existing) throw new Error("já existe uma solicitação de reembolso para esta compra");

    const txId = (row.transaction_id as string | null) ?? null;
    let asaasPaymentId: string | null = (row.provider_ref as string | null) ?? null;
    if (!asaasPaymentId && txId) {
      const { data: tx } = await supabase
        .from("transactions")
        .select("provider_ref")
        .eq("id", txId)
        .maybeSingle();
      asaasPaymentId = tx?.provider_ref ?? null;
    }

    const { data: req, error } = await (await adminDb())
      .from("refund_requests")
      .insert({
        user_id: userId,
        reference_type: data.referenceType,
        reference_id: data.referenceId,
        transaction_id: txId,
        amount_cents: Number(row.amount_cents),
        reason: data.reason,
        status: "pending",
        asaas_payment_id: asaasPaymentId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: req.id as string };
  });

export const cancelRefundRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (await adminDb())
      .from("refund_requests")
      .update({ status: "cancelled" })
      .eq("id", data.requestId)
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyRefundRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RefundRequestItem[]> => {
    const { supabase, userId } = context;

    const { data: rows, error } = await supabase
      .from("refund_requests")
      .select("id, reference_type, reference_id, amount_cents, reason, status, admin_notes, created_at, resolved_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    const pubIds: string[] = [];
    const msgIds: string[] = [];

    for (const r of rows ?? []) {
      if (r.reference_type === "publication_unlock") pubIds.push(r.reference_id as string);
      if (r.reference_type === "chat_message_unlock") msgIds.push(r.reference_id as string);
    }

    const [{ pubs, media }, { data: msgs }] = await Promise.all([
      hydratePublications(supabase, pubIds),
      msgIds.length
        ? supabase.from("chat_messages").select("id, content").in("id", msgIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    return (rows ?? []).map((r) => {
      let details: RefundRequestItem["details"] = null;
      if (r.reference_type === "publication_unlock") {
        const p = pubs.get(r.reference_id as string);
        const m = p ? media.find((x: any) => x.publication_id === p.id) : undefined;
        details = {
          caption: p?.caption as string | null,
          thumbUrl: (m?.url ?? p?.preview_url) as string | null,
          mediaType: (m?.type ?? null) as "image" | "video" | null,
        };
      } else if (r.reference_type === "chat_message_unlock") {
        const msg = (msgs ?? []).find((m: any) => m.id === r.reference_id);
        details = { messagePreview: msg?.content ? String(msg.content).slice(0, 120) : null };
      }

      return {
        id: r.id as string,
        referenceType: r.reference_type as string,
        referenceId: r.reference_id as string,
        amountCents: Number(r.amount_cents),
        reason: r.reason as string,
        status: r.status as RefundRequestItem["status"],
        adminNotes: r.admin_notes as string | null,
        createdAt: r.created_at as string,
        resolvedAt: r.resolved_at as string | null,
        details,
      };
    });
  });
