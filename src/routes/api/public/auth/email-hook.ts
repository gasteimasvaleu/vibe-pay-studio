/**
 * Supabase Auth "Send Email" hook — routes every auth email through Resend.
 *
 * Setup in Supabase Dashboard → Authentication → Hooks → Send Email Hook:
 *   URL:    https://monetisexy.com/api/public/auth/email-hook
 *   Secret: v1,whsec_<base64 of AUTH_EMAIL_HOOK_SECRET>
 *
 * Standard Webhooks signature format:
 *   headers: webhook-id, webhook-timestamp, webhook-signature ("v1,<b64sig> ...")
 *   signed:  `${id}.${timestamp}.${rawBody}`
 *   algo:    HMAC-SHA256, key = raw bytes of AUTH_EMAIL_HOOK_SECRET
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  renderAuthEmail,
  type AuthEmailPayload,
} from "@/lib/auth-email-templates.server";

const MAX_SKEW_SECONDS = 5 * 60;

function verifySignature(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
  signatureHeader: string,
): boolean {
  const signed = `${id}.${timestamp}.${body}`;
  const expected = createHmac("sha256", secret).update(signed).digest("base64");

  // signatureHeader can contain multiple space-separated "v1,<sig>" entries
  const parts = signatureHeader.split(" ");
  for (const part of parts) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    try {
      const a = Buffer.from(sig, "base64");
      const b = Buffer.from(expected, "base64");
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      // ignore malformed
    }
  }
  return false;
}

export const Route = createFileRoute("/api/public/auth/email-hook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AUTH_EMAIL_HOOK_SECRET;
        const resendKey = process.env.RESEND_API_KEY;
        const gatewayKey = process.env.LOVABLE_API_KEY;
        const defaultFrom =
          process.env.APP_EMAIL_FROM ??
          "Equipe Monetisexy <no-reply@monetisexy.com>";

        if (!secret) {
          console.error("[auth-email-hook] AUTH_EMAIL_HOOK_SECRET not set");
          return new Response("misconfigured", { status: 500 });
        }
        if (!resendKey || !gatewayKey) {
          console.error("[auth-email-hook] Resend gateway not configured");
          return new Response("misconfigured", { status: 500 });
        }

        const id = request.headers.get("webhook-id");
        const timestamp = request.headers.get("webhook-timestamp");
        const signature = request.headers.get("webhook-signature");
        if (!id || !timestamp || !signature) {
          return new Response("missing signature headers", { status: 401 });
        }

        const nowSec = Math.floor(Date.now() / 1000);
        const tsNum = Number(timestamp);
        if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > MAX_SKEW_SECONDS) {
          return new Response("timestamp out of range", { status: 401 });
        }

        const rawBody = await request.text();
        if (!verifySignature(secret, id, timestamp, rawBody, signature)) {
          console.warn("[auth-email-hook] invalid signature");
          return new Response("invalid signature", { status: 401 });
        }

        let parsed: {
          user: { email?: string };
          email_data: AuthEmailPayload;
        };
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const to = parsed.user?.email ?? parsed.email_data?.email;
        const action = parsed.email_data?.email_action_type;
        if (!to || !action) {
          return new Response("missing user/email_action_type", { status: 400 });
        }

        const { subject, html } = renderAuthEmail(action, parsed.email_data);

        try {
          const res = await fetch(
            "https://connector-gateway.lovable.dev/resend/emails",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${gatewayKey}`,
                "X-Connection-Api-Key": resendKey,
              },
              body: JSON.stringify({
                from: defaultFrom,
                to: [to],
                subject,
                html,
              }),
            },
          );

          if (!res.ok) {
            const errBody = await res.text();
            console.error(
              `[auth-email-hook] Resend failed [${res.status}]: ${errBody}`,
            );
            // 500 tells Supabase to retry.
            return new Response("resend_failed", { status: 500 });
          }

          return Response.json({ ok: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[auth-email-hook] threw", msg);
          return new Response("resend_error", { status: 500 });
        }
      },
    },
  },
});
