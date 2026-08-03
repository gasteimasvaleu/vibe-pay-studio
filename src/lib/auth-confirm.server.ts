import { supabaseAdmin } from "@/integrations/supabase/client.server";

const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;

function isRateLimited(key: string) {
  const now = Date.now();
  const current = hits.get(key);

  if (!current || now > current.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > MAX_PER_WINDOW;
}

export async function getEmailConfirmationStatus(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  if (isRateLimited(email)) return false;

  const { data, error } = await supabaseAdmin.rpc("is_email_confirmed", {
    _email: email,
  });

  if (error) {
    console.error("[checkEmailConfirmed]", error.message);
    throw new Error("email_confirmation_check_failed");
  }

  return Boolean(data);
}