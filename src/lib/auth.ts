import { supabase } from "@/integrations/supabase/client";
import type { useNavigate } from "@tanstack/react-router";

export type AccountType = "subscriber" | "creator";

export function homeForAccountType(accountType?: AccountType | string | null) {
  if (accountType === "creator") return "/creator" as const;
  return "/assinante" as const;
}

/**
 * After a successful sign-in/sign-up, reads the user's profile.account_type
 * and navigates to the correct area (creator vs subscriber).
 */
export async function routeAfterAuth(navigate: ReturnType<typeof useNavigate>) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    navigate({ to: "/entrar" });
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  navigate({ to: homeForAccountType(profile?.account_type) });
}

export function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }

  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return "Este e-mail já está cadastrado.";
  }

  if (normalized.includes("password")) {
    return "A senha não atende aos requisitos de segurança.";
  }

  return message || "Não foi possível concluir a autenticação.";
}

export async function signInWithGoogle(preferred?: {
  accountType?: AccountType;
  username?: string;
}) {
  // External Supabase: OAuth direto pelo Supabase (broker do Lovable exige Cloud).
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: preferred?.accountType
        ? { account_type: preferred.accountType }
        : undefined,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signUpWithEmail({
  accountType,
  email,
  password,
  username,
}: {
  accountType: AccountType;
  email: string;
  password: string;
  username: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_type: accountType,
        username,
      },
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    throw error;
  }

  if (data.user && data.session) {
    await ensureCurrentUserProfile({ accountType, username });
  }

  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  await ensureCurrentUserProfile();
}

export async function ensureCurrentUserProfile(preferred?: {
  accountType?: AccountType;
  username?: string;
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return;
  }

  const user = userData.user;

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError || existing) {
    return;
  }

  const metadata = user.user_metadata as {
    account_type?: AccountType;
    full_name?: string;
    name?: string;
    user_name?: string;
    username?: string;
  };

  const fallbackName =
    preferred?.username ??
    metadata.username ??
    metadata.user_name ??
    user.email?.split("@")[0] ??
    metadata.full_name ??
    metadata.name ??
    "usuario";

  const username = makeUsername(fallbackName, user.id);
  const accountType = preferred?.accountType ?? metadata.account_type ?? "subscriber";

  const { error } = await supabase.from("profiles").insert({
    account_type: accountType,
    user_id: user.id,
    username,
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw error;
  }
}

function makeUsername(value: string, userId: string) {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 21);

  const safeBase = base.length >= 3 ? base : "usuario";
  return `${safeBase}_${userId.slice(0, 8)}`.slice(0, 30);
}