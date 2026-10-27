import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Resolves the current viewer's country code (ISO 2 letters) using the
 * Cloudflare `cf-ipcountry` request header. Also opportunistically fills
 * `profiles.country` for the authenticated caller when it is still null,
 * so profile-owner side of country filters ("restrict_search_country")
 * has data to compare against.
 */
export const resolveViewerCountry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const raw =
      getRequestHeader("cf-ipcountry") ||
      getRequestHeader("x-vercel-ip-country") ||
      getRequestHeader("x-country-code") ||
      null;
    const country =
      raw && /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : null;

    if (country) {
      // Best-effort backfill of the caller's own profile.country.
      const { data: existing } = await context.supabase
        .from("profiles_public" as any)
        .select("country")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (existing && !existing.country) {
        await ((await import("@/integrations/supabase/client.server")).supabaseAdmin as any)
          .from("profiles")
          .update({ country })
          .eq("user_id", context.userId);
      }
    }

    return { country };
  });
