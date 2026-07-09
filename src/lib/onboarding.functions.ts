import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const handleSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[A-Za-z0-9._]+$/)
  .nullable();

const socialLinksSchema = z.object({
  instagram_handle: handleSchema.optional().nullable(),
  tiktok_handle: handleSchema.optional().nullable(),
  x_handle: handleSchema.optional().nullable(),
});

export const saveSocialLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => socialLinksSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        instagram_handle: data.instagram_handle || null,
        tiktok_handle: data.tiktok_handle || null,
        x_handle: data.x_handle || null,
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const pricingSchema = z.object({
  price_monthly: z.number().min(19.9).max(200),
  discount_quarterly: z.number().int().min(0).max(90),
  discount_semiannual: z.number().int().min(0).max(90),
});

export const saveSubscriptionPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => pricingSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        price_monthly: data.price_monthly,
        discount_quarterly: data.discount_quarterly,
        discount_semiannual: data.discount_semiannual,
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const createSessionSchema = z.object({
  return_url: z.string().url(),
});

export const createIdentityVerificationSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSessionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return {
        ok: false as const,
        error: "stripe_not_configured",
        message:
          "A verificação de documentos ainda não está configurada. Tente novamente em instantes.",
      };
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secret, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    try {
      const session = await stripe.identity.verificationSessions.create({
        type: "document",
        options: {
          document: {
            require_matching_selfie: true,
            require_live_capture: true,
          },
        },
        metadata: { user_id: context.userId },
        return_url: data.return_url,
      });

      const { error } = await context.supabase
        .from("profiles")
        .update({
          stripe_verification_session_id: session.id,
          kyc_status: "processing",
        })
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);

      return {
        ok: true as const,
        url: session.url,
        session_id: session.id,
      };
    } catch (err) {
      console.error("[stripe-identity] create session failed", err);
      return {
        ok: false as const,
        error: "stripe_error",
        message: err instanceof Error ? err.message : "Erro ao iniciar verificação.",
      };
    }
  });

export const getKycStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("kyc_status, kyc_verified_at, stripe_verification_session_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      status: (data?.kyc_status ?? "not_started") as
        | "not_started"
        | "processing"
        | "verified"
        | "requires_input"
        | "canceled",
      verified_at: data?.kyc_verified_at ?? null,
      session_id: data?.stripe_verification_session_id ?? null,
    };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
