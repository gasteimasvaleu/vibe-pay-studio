import { supabase } from "@/integrations/supabase/client";
import type { useNavigate } from "@tanstack/react-router";

export type AccountType = "subscriber" | "creator" | "free_creator";

/**
 * Retorna true para contas que possuem página pública própria e acessam
 * as mesmas funcionalidades do creator (creator pago e perfil gratuito).
 */
export function isCreatorLike(accountType?: string | null): boolean {
  return accountType === "creator" || accountType === "free_creator";
}

export function homeForAccountType(_accountType?: AccountType | string | null) {
  // Home única para todos os usuários.
  return "/feed" as const;
}

/**
 * After a successful sign-in/sign-up, sends the user to the pending creator
 * onboarding step (when there is one) or to the feed.
 */
export async function routeAfterAuth(navigate: ReturnType<typeof useNavigate>) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    await navigate({ to: "/entrar" });
    return;
  }
  let step: string | null = null;
  try {
    const { resolveCreatorOnboardingStep } = await import("./onboarding-step");
    step = await resolveCreatorOnboardingStep();
  } catch {
    step = null;
  }
  await navigate({ to: step ?? "/feed" });
}

export function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("missing email") ||
    normalized.includes("missing phone") ||
    normalized.includes("email or phone")
  ) {
    return "Informe seu e-mail e senha.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }

  if (normalized.includes("email") && normalized.includes("invalid")) {
    return "E-mail inválido.";
  }

  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return "Este e-mail já está cadastrado.";
  }

  if (normalized.includes("over_email_send_rate_limit")) {
    return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  }

  if (normalized.includes("email_address_invalid")) {
    return "O endereço de e-mail informado é inválido.";
  }

  if (normalized.includes("email_not_confirmed") || normalized.includes("not confirmed")) {
    return "Este e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";
  }

  if (normalized.includes("user_not_found") || normalized.includes("user not found")) {
    return "Não encontramos uma conta com este e-mail. Faça o cadastro novamente.";
  }

  if (normalized.includes("password")) {
    return "A senha não atende aos requisitos de segurança.";
  }

  return "Não foi possível concluir a autenticação.";
}

export async function signInWithGoogle(preferred?: {
  accountType?: AccountType;
  username?: string;
}) {
  // External Supabase: OAuth direto pelo Supabase (broker do Lovable exige Cloud).
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
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
    // Aguarda o Supabase confirmar a sessão nova antes de resolver, para evitar
    // corrida com o gate `_authenticated` (que lê `getUser()` no beforeLoad).
    try {
      await supabase.auth.getUser();
    } catch {
      // Silencioso: se falhar, o listener global em __root.tsx invalida na sequência.
    }
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
    .from("profiles_public" as any)
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

  const username = await resolveAvailableUsername(fallbackName);
  const requested = preferred?.accountType ?? metadata.account_type ?? "subscriber";
  // "creator" só é liberado pelo servidor após a verificação de identidade.
  const accountType: AccountType = requested === "creator" ? "subscriber" : requested;

  const { error } = await supabase.from("profiles").insert({
    account_type: accountType,
    user_id: user.id,
    username,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    const isDuplicate = msg.includes("duplicate") || msg.includes("unique");
    if (!isDuplicate) throw error;
    if (!msg.includes("username")) return;

    // Corrida em `username`: aplica sufixos numéricos curtos até conseguir.
    const base = normalizeBase(fallbackName);
    for (let i = 2; i <= 99; i++) {
      const { error: retryError } = await supabase.from("profiles").insert({
        account_type: accountType,
        user_id: user.id,
        username: withNumericSuffix(base, i),
      });
      if (!retryError) return;
      const retryMsg = retryError.message.toLowerCase();
      if (!retryMsg.includes("duplicate") && !retryMsg.includes("unique")) throw retryError;
      if (!retryMsg.includes("username")) return;
    }
  }
}


function normalizeBase(value: string): string {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return base.length >= 3 ? base : "usuario";
}

async function resolveAvailableUsername(value: string): Promise<string> {
  const base = normalizeBase(value);

  const { data, error } = await supabase.rpc("resolve_available_username", {
    desired: base,
  });

  if (error || typeof data !== "string" || data.length < 3) {
    // Nunca "assume ocupado": tenta o nome limpo e deixa o banco decidir.
    return base;
  }

  return data;
}

function withNumericSuffix(base: string, index: number): string {
  const suffix = `_${index}`;
  return `${base.slice(0, 30 - suffix.length)}${suffix}`;
}

