/**
 * Transactional email dispatcher.
 *
 * Every send path goes through this helper so both the master switch
 * (`profiles.emails_enabled`) and the per-kind preferences
 * (`email_preferences.<kind>`) are respected via the `can_send_email` RPC.
 *
 * Resend integration is stubbed here — once RESEND_API_KEY is configured,
 * replace the TODO with the actual HTTP call to the Resend Gateway.
 */

export type EmailKind =
  | "free_to_paid"
  | "post_sales"
  | "subscription_sales"
  | "content_purchase"
  | "creator_referrals";

export type SendEmailInput = {
  userId: string;
  kind: EmailKind;
  to: string;
  subject: string;
  html: string;
  from?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: "user_opted_out" }
  | { ok: false; skipped: false; error: string };

export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allowed, error: rpcError } = await (supabaseAdmin as any).rpc(
    "can_send_email",
    { _user_id: input.userId, _kind: input.kind },
  );
  if (rpcError) {
    return { ok: false, skipped: false, error: rpcError.message };
  }
  if (allowed !== true) {
    return { ok: false, skipped: true, reason: "user_opted_out" };
  }

  const resendKey = process.env.RESEND_API_KEY;
  const gatewayKey = process.env.LOVABLE_API_KEY;

  if (!resendKey || !gatewayKey) {
    // Configuration pending — log & no-op instead of crashing callers.
    console.warn(
      "[email] Resend not configured (RESEND_API_KEY/LOVABLE_API_KEY missing). Skipping send.",
      { kind: input.kind },
    );
    return { ok: false, skipped: false, error: "resend_not_configured" };
  }

  const defaultFrom =
    process.env.APP_EMAIL_FROM ?? "Monetisexy <onboarding@resend.dev>";
  try {
    const response = await fetch(
      "https://connector-gateway.lovable.dev/resend/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${gatewayKey}`,
          "X-Connection-Api-Key": resendKey,
        },
        body: JSON.stringify({
          from: input.from ?? defaultFrom,
          to: [input.to],
          subject: input.subject,
          html: input.html,
        }),
      },
    );
    if (!response.ok) {
      const body = await response.text();
      console.error(`[email] Resend failed [${response.status}]: ${body}`);
      return { ok: false, skipped: false, error: body };
    }
    const json = (await response.json()) as { id?: string };
    return { ok: true, id: json.id ?? "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] Resend threw", msg);
    return { ok: false, skipped: false, error: msg };
  }
}

/**
 * Look up a user's primary email via Supabase Auth Admin.
 * Returns null when the user has no email (edge: phone-only signups) or when
 * the admin lookup fails — caller should log & skip in that case.
 */
export async function resolveUserEmail(userId: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).auth.admin.getUserById(userId);
    if (error) {
      console.warn("[email] resolveUserEmail failed", userId, error.message);
      return null;
    }
    const email = data?.user?.email as string | undefined;
    return email && email.length > 0 ? email : null;
  } catch (err) {
    console.warn("[email] resolveUserEmail threw", userId, err);
    return null;
  }
}

// TODO(creator_referrals): dispara quando um perfil indicado (referred_by)
// se torna criador. Aguardando coluna `profiles.referred_by` para acionar via
// `sendTransactionalEmail({ kind: "creator_referrals", ... })`.
