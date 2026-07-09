import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { Buffer } from "buffer";

/**
 * Veriff Decision webhook.
 * Docs: https://developers.veriff.com/#decision-webhook
 * Signature: HMAC-SHA256 hex of the raw request body using VERIFF_API_SECRET,
 * delivered in the `x-hmac-signature` header.
 *
 * We always return 200 on internal failures (after logging) so Veriff does not
 * enter an aggressive retry loop — the client polls `verification-status` and
 * is the source of truth for the user's UI state.
 */
export const Route = createFileRoute("/api/public/webhooks/veriff-decision")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiSecret = process.env.VERIFF_API_SECRET;
          if (!apiSecret) {
            console.error("[veriff webhook] missing VERIFF_API_SECRET");
            return new Response("Webhook not configured", { status: 503 });
          }

          const signature = request.headers.get("x-hmac-signature");
          if (!signature) {
            console.warn("[veriff webhook] missing x-hmac-signature");
            return new Response("Missing signature", { status: 400 });
          }

          const rawBody = await request.text();
          const expected = createHmac("sha256", apiSecret).update(rawBody).digest("hex");

          let signaturesMatch = false;
          try {
            const sigBuf = Buffer.from(signature.toLowerCase(), "utf8");
            const expBuf = Buffer.from(expected.toLowerCase(), "utf8");
            signaturesMatch =
              sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
          } catch (err) {
            console.error("[veriff webhook] signature compare error", err);
          }
          if (!signaturesMatch) {
            console.warn("[veriff webhook] invalid signature");
            return new Response("Invalid signature", { status: 401 });
          }

          let payload: {
            verification?: {
              id?: string;
              status?: string;
              code?: number;
              vendorData?: string;
            };
          };
          try {
            payload = JSON.parse(rawBody);
          } catch (err) {
            console.error("[veriff webhook] invalid JSON", err);
            return new Response("Invalid JSON", { status: 400 });
          }

          const verification = payload.verification;
          if (!verification?.id || !verification.status) {
            console.warn("[veriff webhook] payload missing verification.id/status", {
              hasVerification: !!verification,
            });
            return new Response("Ignored", { status: 200 });
          }

          console.log("[veriff webhook] decision", {
            id: verification.id,
            status: verification.status,
            code: verification.code,
            vendorData: verification.vendorData,
          });

          // Map Veriff status → internal kyc_status enum.
          const statusMap: Record<
            string,
            "verified" | "requires_input" | "canceled" | "processing"
          > = {
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
            account_type?: string;
            onboarding_completed_at?: string;
          } = {
            kyc_status: nextStatus,
            veriff_session_id: verification.id,
          };
          if (nextStatus === "verified") {
            const now = new Date().toISOString();
            update.kyc_verified_at = now;
            update.account_type = "creator";
            update.onboarding_completed_at = now;
          }

          // Prefer matching by vendorData (userId); fall back to veriff_session_id.
          let query = supabaseAdmin.from("profiles").update(update).select("user_id");
          if (verification.vendorData) {
            query = query.eq("user_id", verification.vendorData);
          } else {
            query = query.eq("veriff_session_id", verification.id);
          }
          const { data: updatedRows, error } = await query;
          if (error) {
            console.error("[veriff webhook] update failed", error);
            // Return 200 to avoid Veriff retry storm; client polling is the fallback.
            return new Response("ok", {
              status: 200,
              headers: { "x-webhook-error": "update-failed" },
            });
          }
          if (!updatedRows || updatedRows.length === 0) {
            console.warn("[veriff webhook] no profile matched", {
              vendorData: verification.vendorData,
              veriffSessionId: verification.id,
            });
          } else {
            console.log("[veriff webhook] profile updated", {
              rows: updatedRows.length,
              nextStatus,
            });
          }

          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[veriff webhook] unhandled error", err);
          return new Response("ok", {
            status: 200,
            headers: { "x-webhook-error": "unhandled" },
          });
        }
      },
    },
  },
});
