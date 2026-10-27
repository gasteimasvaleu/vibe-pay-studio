/**
 * Server-only helpers that fetch context for a completed monetization event
 * and dispatch the transactional emails via `sendTransactionalEmail`.
 *
 * All functions are best-effort: they log and swallow errors so they never
 * break the payment flow. Every send goes through `sendTransactionalEmail`,
 * which itself gates on the `can_send_email` RPC (master + per-kind switches).
 */

import { resolveUserEmail, sendTransactionalEmail } from "./email.server";
import { renderTemplate } from "./email-templates.server";

const APP_BASE_URL =
  process.env.APP_BASE_URL ?? "https://monetisexy.com";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

async function getAdmin(): Promise<AdminClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function getDisplayName(
  admin: AdminClient,
  userId: string,
): Promise<string> {
  const { data } = await admin
    .from("profiles_public")
    .select("display_name, username")
    .eq("user_id", userId)
    .maybeSingle();
  return (
    (data?.display_name as string | undefined) ||
    (data?.username as string | undefined) ||
    "Usuário"
  );
}

function planLabel(plan: string): string {
  return plan === "quarterly"
    ? "trimestral"
    : plan === "semiannual"
      ? "semestral"
      : "mensal";
}

export async function notifyPublicationUnlock(unlockId: string): Promise<void> {
  try {
    const admin = await getAdmin();
    const { data: unlock } = await admin
      .from("publication_unlocks")
      .select("buyer_id, amount_cents, publication_id")
      .eq("id", unlockId)
      .maybeSingle();
    if (!unlock) return;

    const { data: pub } = await admin
      .from("publications")
      .select("id, author_id")
      .eq("id", unlock.publication_id)
      .maybeSingle();
    if (!pub) return;

    const publicationUrl = `${APP_BASE_URL}/feed?p=${pub.id}`;
    const amountBRL = brl(unlock.amount_cents);

    const [buyerName, creatorName, sellerEmail, buyerEmail] = await Promise.all([
      getDisplayName(admin, unlock.buyer_id),
      getDisplayName(admin, pub.author_id),
      resolveUserEmail(pub.author_id),
      resolveUserEmail(unlock.buyer_id),
    ]);

    const jobs: Array<Promise<unknown>> = [];

    if (sellerEmail) {
      const tpl = await renderTemplate("post_sales", {
        buyerName,
        amountBRL,
        publicationUrl,
      });
      jobs.push(
        sendTransactionalEmail({
          userId: pub.author_id,
          kind: "post_sales",
          to: sellerEmail,
          subject: tpl.subject,
          html: tpl.html,
        }),
      );
    }

    if (buyerEmail) {
      const tpl = await renderTemplate("content_purchase", {
        creatorName,
        amountBRL,
        publicationUrl,
        what: "publicação",
      });
      jobs.push(
        sendTransactionalEmail({
          userId: unlock.buyer_id,
          kind: "content_purchase",
          to: buyerEmail,
          subject: tpl.subject,
          html: tpl.html,
        }),
      );
    }

    await Promise.allSettled(jobs);
  } catch (err) {
    console.error("[email-events] notifyPublicationUnlock failed", err);
  }
}

export async function notifyChatUnlock(unlockId: string): Promise<void> {
  try {
    const admin = await getAdmin();
    const { data: unlock } = await admin
      .from("chat_message_unlocks")
      .select("buyer_id, creator_id, amount_cents")
      .eq("id", unlockId)
      .maybeSingle();
    if (!unlock) return;

    const [creatorName, buyerEmail] = await Promise.all([
      getDisplayName(admin, unlock.creator_id),
      resolveUserEmail(unlock.buyer_id),
    ]);
    if (!buyerEmail) return;

    const tpl = await renderTemplate("content_purchase", {
      creatorName,
      amountBRL: brl(unlock.amount_cents),
      publicationUrl: `${APP_BASE_URL}/chat`,
      what: "mensagem",
    });
    await sendTransactionalEmail({
      userId: unlock.buyer_id,
      kind: "content_purchase",
      to: buyerEmail,
      subject: tpl.subject,
      html: tpl.html,
    });
  } catch (err) {
    console.error("[email-events] notifyChatUnlock failed", err);
  }
}

export async function notifySubscriptionActive(
  subscriptionId: string,
): Promise<void> {
  try {
    const admin = await getAdmin();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("creator_id, subscriber_id, plan, price_cents_paid")
      .eq("id", subscriptionId)
      .maybeSingle();
    if (!sub) return;

    const [subscriberName, sellerEmail] = await Promise.all([
      getDisplayName(admin, sub.subscriber_id),
      resolveUserEmail(sub.creator_id),
    ]);
    if (!sellerEmail) return;

    const tpl = await renderTemplate("subscription_sales", {
      subscriberName,
      amountBRL: brl(sub.price_cents_paid),
      planLabel: planLabel(sub.plan as string),
      dashboardUrl: `${APP_BASE_URL}/dashboard`,
    });
    await sendTransactionalEmail({
      userId: sub.creator_id,
      kind: "subscription_sales",
      to: sellerEmail,
      subject: tpl.subject,
      html: tpl.html,
    });
  } catch (err) {
    console.error("[email-events] notifySubscriptionActive failed", err);
  }
}

export async function notifyFreeToPaid(creatorUserId: string): Promise<void> {
  try {
    const admin = await getAdmin();

    const { data: creator } = await admin
      .from("profiles")
      .select("display_name, username, referred_by")
      .eq("user_id", creatorUserId)
      .maybeSingle();
    if (!creator?.username) return;

    const creatorName =
      (creator.display_name as string | undefined) ||
      (creator.username as string);
    const creatorUrl = `${APP_BASE_URL}/perfil/${creator.username}`;

    // Fan-out para seguidores
    const { data: followers } = await admin
      .from("follows")
      .select("follower_id")
      .eq("followee_id", creatorUserId)
      .limit(5000);

    const ids = (followers ?? [])
      .map((r: { follower_id: string }) => r.follower_id)
      .filter(Boolean);

    const tpl = await renderTemplate("free_to_paid", {
      creatorName,
      creatorUrl,
    });

    const chunkSize = 20;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      // eslint-disable-next-line no-await-in-loop
      await Promise.allSettled(
        chunk.map(async (uid: string) => {
          const to = await resolveUserEmail(uid);
          if (!to) return;
          await sendTransactionalEmail({
            userId: uid,
            kind: "free_to_paid",
            to,
            subject: tpl.subject,
            html: tpl.html,
          });
        }),
      );
    }

  } catch (err) {
    console.error("[email-events] notifyFreeToPaid failed", err);
  }
}

/**
 * Envia o e-mail com QR code do PIX ao assinante. Chamado no 1º ciclo
 * (checkout) e em cada renovação automática (webhook PAYMENT_CREATED).
 */
export async function notifyPixInvoice(input: {
  subscriberId: string;
  creatorId: string;
  plan: string;
  amountCents: number;
  dueDate: string; // dd/mm/yyyy
  invoiceUrl: string;
  qrImageBase64: string; // base64 (sem prefixo data:)
  qrPayload: string;
}): Promise<void> {
  try {
    const admin = await getAdmin();
    const [buyerEmail, creatorName] = await Promise.all([
      resolveUserEmail(input.subscriberId),
      getDisplayName(admin, input.creatorId),
    ]);
    if (!buyerEmail) return;

    const tpl = await renderTemplate("pix_invoice", {
      creatorName,
      planLabel: planLabel(input.plan),
      amountBRL: brl(input.amountCents),
      dueDate: input.dueDate,
      invoiceUrl: input.invoiceUrl,
      qrImageDataUrl: `data:image/png;base64,${input.qrImageBase64}`,
      qrCopyPaste: input.qrPayload,
    });

    await sendTransactionalEmail({
      userId: input.subscriberId,
      kind: "pix_invoice",
      to: buyerEmail,
      subject: tpl.subject,
      html: tpl.html,
    });
  } catch (err) {
    console.error("[email-events] notifyPixInvoice failed", err);
  }
}
