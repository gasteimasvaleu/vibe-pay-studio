import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Veriff Decision webhook.
 * Docs: https://developers.veriff.com/#decision-webhook
 * Signature: HMAC-SHA256 hex of the raw request body using VERIFF_API_SECRET,
 * delivered in the `x-hmac-signature` header.
 */
export const Route = createFileRoute("/api/public/webhooks/veriff-decision")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiSecret = process.env.VERIFF_API_SECRET;
        if (!apiSecret) {
          console.error("[veriff webhook] missing VERIFF_API_SECRET");
          return new Response("Webhook not configured", { status: 503 });
        }

        const signature = request.headers.get("x-hmac-signature");
        if (!signature) {
          return new Response("Missing signature", { status: 400 });
        }

        const rawBody = await request.text();
        const expected = createHmac("sha256", apiSecret).update(rawBody).digest("hex");
        const sigBuf = Buffer.from(signature.toLowerCase(), "utf8");
        const expBuf = Buffer.from(expected.toLowerCase(), "utf8");
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          console.warn("[veriff webhook] invalid signature");
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: {
          verification?: {
            id?: string;
            status?: string;
            vendorData?: string;
          };
        };
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const verification = payload.verification;
        if (!verification?.id || !verification.status) {
          return new Response("Ignored", { status: 200 });
        }

        // Map Veriff status → internal kyc_status enum.
        // Veriff decision statuses: approved | resubmission_requested | declined | expired | abandoned | review.
        const statusMap: Record<string, "verified" | "requires_input" | "canceled" | "processing"> = {
          approved: "verified",
          resubmission_requested: "requires_input",
          declined: "requires_input",
          expired: "canceled",
          abandoned: "canceled",
          review: "processing",
          submitted: "processing",
          created: "processing",
        };
        const nextStatus = statusMap[verification.status] ?? "processing";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const update: {
          kyc_status: string;
          veriff_session_id: string;
          kyc_verified_at?: string;
        } = {
          kyc_status: nextStatus,
          veriff_session_id: verification.id,
        };
        if (nextStatus === "verified") {
          update.kyc_verified_at = new Date().toISOString();
        }

        // Prefer matching by veriff_session_id; fall back to vendorData (userId).
        let query = supabaseAdmin.from("profiles").update(update);
        if (verification.vendorData) {
          query = query.eq("user_id", verification.vendorData);
        } else {
          query = query.eq("veriff_session_id", verification.id);
        }
        const { error } = await query;
        if (error) {
          console.error("[veriff webhook] update failed", error);
          return new Response("Update failed", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
