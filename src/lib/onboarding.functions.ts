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
    const apiKey = process.env.VERIFF_API_KEY;
    const apiSecret = process.env.VERIFF_API_SECRET;
    if (!apiKey || !apiSecret) {
      return {
        ok: false as const,
        error: "veriff_not_configured",
        message:
          "A verificação de documentos ainda não está configurada. Tente novamente em instantes.",
      };
    }

    // Fetch user's name to prefill Veriff person data (opcional; Veriff aceita nomes vazios).
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("username")
      .eq("user_id", context.userId)
      .maybeSingle();

    try {
      const body = JSON.stringify({
        verification: {
          callback: data.return_url,
          person: {
            firstName: profile?.username ?? "Creator",
            lastName: "-",
          },
          vendorData: context.userId,
          lang: "pt-BR",
        },
      });

      const { createHmac } = await import("crypto");
      const signature = createHmac("sha256", apiSecret).update(body).digest("hex");

      const res = await fetch("https://stationapi.veriff.com/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-CLIENT": apiKey,
          "X-HMAC-SIGNATURE": signature,
        },
        body,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[veriff] create session failed", res.status, text);
        return {
          ok: false as const,
          error: "veriff_error",
          message: "Não foi possível iniciar a verificação. Tente novamente em instantes.",
        };
      }

      const payload = (await res.json()) as {
        status: string;
        verification?: { id: string; url: string; sessionToken?: string };
      };
      const session = payload.verification;
      if (!session?.id || !session.url) {
        console.error("[veriff] unexpected payload", payload);
        return {
          ok: false as const,
          error: "veriff_error",
          message: "Resposta inesperada do provedor de verificação.",
        };
      }

      const { error } = await context.supabase
        .from("profiles")
        .update({
          veriff_session_id: session.id,
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
      console.error("[veriff] create session error", err);
      return {
        ok: false as const,
        error: "veriff_error",
        message: err instanceof Error ? err.message : "Erro ao iniciar verificação.",
      };
    }
  });

export const getKycStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("kyc_status, kyc_verified_at, veriff_session_id")
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
      session_id: data?.veriff_session_id ?? null,
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
