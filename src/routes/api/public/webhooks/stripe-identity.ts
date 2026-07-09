import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/stripe-identity")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;

        if (!secret || !webhookSecret) {
          console.error("[stripe-identity webhook] missing secrets");
          return new Response("Webhook not configured", { status: 503 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response("Missing signature", { status: 400 });
        }

        const rawBody = await request.text();

        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(secret, {
          httpClient: Stripe.createFetchHttpClient(),
        });

        let event: import("stripe").Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            webhookSecret,
          );
        } catch (err) {
          console.error("[stripe-identity webhook] signature verification failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        const relevant = new Set([
          "identity.verification_session.verified",
          "identity.verification_session.requires_input",
          "identity.verification_session.canceled",
          "identity.verification_session.processing",
        ]);
        if (!relevant.has(event.type)) {
          return new Response("Ignored", { status: 200 });
        }

        const session = event.data.object as import("stripe").Stripe.Identity.VerificationSession;
        const userId = session.metadata?.user_id;
        if (!userId) {
          console.warn("[stripe-identity webhook] no user_id in metadata", session.id);
          return new Response("Missing metadata.user_id", { status: 200 });
        }

        const statusMap: Record<string, string> = {
          "identity.verification_session.verified": "verified",
          "identity.verification_session.requires_input": "requires_input",
          "identity.verification_session.canceled": "canceled",
          "identity.verification_session.processing": "processing",
        };
        const nextStatus = statusMap[event.type];

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const update: Record<string, unknown> = {
          kyc_status: nextStatus,
          stripe_verification_session_id: session.id,
        };
        if (nextStatus === "verified") {
          update.kyc_verified_at = new Date().toISOString();
        }
        const { error } = await supabaseAdmin
          .from("profiles")
          .update(update)
          .eq("user_id", userId);
        if (error) {
          console.error("[stripe-identity webhook] update failed", error);
          return new Response("Update failed", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
