import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PrivacySettings = {
  restrict_search: boolean;
  restrict_search_br: boolean;
  restrict_search_country: boolean;
  show_followers: boolean;
  restrict_mentions: boolean;
  restrict_friendships: boolean;
  emails_enabled: boolean;
};

export type EmailPreferences = {
  free_to_paid: boolean;
  post_sales: boolean;
  subscription_sales: boolean;
  content_purchase: boolean;
  creator_referrals: boolean;
};

const PRIVACY_KEYS = [
  "restrict_search",
  "restrict_search_br",
  "restrict_search_country",
  "show_followers",
  "restrict_mentions",
  "restrict_friendships",
  "emails_enabled",
] as const;

const EMAIL_KEYS = [
  "free_to_paid",
  "post_sales",
  "subscription_sales",
  "content_purchase",
  "creator_referrals",
] as const;

const PRIVACY_DEFAULTS: PrivacySettings = {
  restrict_search: false,
  restrict_search_br: false,
  restrict_search_country: false,
  show_followers: true,
  restrict_mentions: false,
  restrict_friendships: false,
  emails_enabled: true,
};

const EMAIL_DEFAULTS: EmailPreferences = {
  free_to_paid: true,
  post_sales: true,
  subscription_sales: true,
  content_purchase: true,
  creator_referrals: true,
};

export const getPrivacySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PrivacySettings> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "restrict_search, restrict_search_br, restrict_search_country, show_followers, restrict_mentions, restrict_friendships, emails_enabled",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return PRIVACY_DEFAULTS;
    return {
      restrict_search: !!data.restrict_search,
      restrict_search_br: !!data.restrict_search_br,
      restrict_search_country: !!data.restrict_search_country,
      show_followers: data.show_followers !== false,
      restrict_mentions: !!data.restrict_mentions,
      restrict_friendships: !!data.restrict_friendships,
      emails_enabled: data.emails_enabled !== false,
    };
  });

export const updatePrivacySetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; value: boolean }) =>
    z
      .object({
        key: z.enum(PRIVACY_KEYS),
        value: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ [data.key]: data.value })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, key: data.key, value: data.value };
  });

export const getEmailPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailPreferences> => {
    const { supabase, userId } = context;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("email_preferences")
      .select(
        "free_to_paid, post_sales, subscription_sales, content_purchase, creator_referrals",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return EMAIL_DEFAULTS;
    return {
      free_to_paid: data.free_to_paid !== false,
      post_sales: data.post_sales !== false,
      subscription_sales: data.subscription_sales !== false,
      content_purchase: data.content_purchase !== false,
      creator_referrals: data.creator_referrals !== false,
    };
  });

export const updateEmailPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; value: boolean }) =>
    z
      .object({
        key: z.enum(EMAIL_KEYS),
        value: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("email_preferences")
      .upsert(
        { user_id: userId, [data.key]: data.value },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, key: data.key, value: data.value };
  });
