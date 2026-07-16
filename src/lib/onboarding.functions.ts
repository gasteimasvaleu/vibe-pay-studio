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

type KycStatus =
  | "not_started"
  | "processing"
  | "verified"
  | "requires_input"
  | "canceled";

const veriffStatusMap: Record<string, KycStatus> = {
  approved: "verified",
  resubmission_requested: "requires_input",
  declined: "requires_input",
  expired: "canceled",
  abandoned: "canceled",
  review: "processing",
  submitted: "processing",
  created: "processing",
};

export const getKycStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("kyc_status, kyc_verified_at, veriff_session_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    let status = (data?.kyc_status ?? "not_started") as KycStatus;
    let verifiedAt = data?.kyc_verified_at ?? null;
    const sessionId = data?.veriff_session_id ?? null;

    // Fallback: if webhook didn't arrive yet, ask Veriff directly.
    if ((status === "processing" || status === "not_started") && sessionId) {
      const apiKey = process.env.VERIFF_API_KEY;
      const apiSecret = process.env.VERIFF_API_SECRET;
      if (apiKey && apiSecret) {
        try {
          const { createHmac } = await import("crypto");
          const signature = createHmac("sha256", apiSecret).update(sessionId).digest("hex");
          const res = await fetch(
            `https://stationapi.veriff.com/v1/sessions/${sessionId}/decision`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-AUTH-CLIENT": apiKey,
                "X-HMAC-SIGNATURE": signature,
              },
            },
          );
          if (res.ok) {
            const payload = (await res.json()) as {
              verification?: { status?: string } | null;
            };
            const veriffStatus = payload.verification?.status;
            if (veriffStatus && veriffStatusMap[veriffStatus]) {
              const next = veriffStatusMap[veriffStatus];
              if (next !== status) {
                const update: {
                  kyc_status: KycStatus;
                  kyc_verified_at?: string;
                  account_type?: string;
                  onboarding_completed_at?: string;
                } = { kyc_status: next };
                if (next === "verified") {
                  const now = new Date().toISOString();
                  update.kyc_verified_at = now;
                  update.account_type = "creator";
                  update.onboarding_completed_at = now;
                  verifiedAt = now;
                }
                const { error: upErr } = await context.supabase
                  .from("profiles")
                  .update(update)
                  .eq("user_id", context.userId);
                if (!upErr) {
                  status = next;
                  if (next === "verified") {
                    try {
                      const events = await import("./email-events.server");
                      await events.notifyFreeToPaid(context.userId);
                    } catch (err) {
                      console.error("[onboarding] notifyFreeToPaid failed", err);
                    }
                  }
                }
              }
            }
          } else {
            console.warn("[veriff] decision fetch non-ok", res.status);
          }
        } catch (err) {
          console.warn("[veriff] decision fetch failed", err);
        }
      }
    }

    return {
      status,
      verified_at: verifiedAt,
      session_id: sessionId,
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

// ============================================================
// Perfil Gratuito ("free_creator") — persistência do fluxo
// /criar-perfil-gratuito
// ============================================================

const freeCreatorSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_.]+$/),
  displayName: z.string().trim().min(1).max(60),
  bio: z.string().trim().max(500).optional().nullable(),
  avatarUrl: z.string().url().max(2048).optional().nullable(),
  coverUrl: z.string().url().max(2048).optional().nullable(),
});

export const createFreeCreatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => freeCreatorSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Bloqueia downgrade: creator pago não pode virar free_creator.
    const { data: current, error: readErr } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (current?.account_type === "creator") {
      throw new Error("already_creator");
    }

    // Handle único: rejeita se já em uso por outro usuário.
    const { data: taken, error: takenErr } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", data.handle)
      .neq("user_id", userId)
      .maybeSingle();
    if (takenErr) throw new Error(takenErr.message);
    if (taken) throw new Error("handle_taken");

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        username: data.handle,
        account_type: "free_creator",
        display_name: data.displayName,
        bio: data.bio ?? null,
        avatar_url: data.avatarUrl ?? null,
        cover_url: data.coverUrl ?? null,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, username: data.handle };
  });
