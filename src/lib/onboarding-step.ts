import { supabase } from "@/integrations/supabase/client";

export type CreatorOnboardingInput = {
  accountType?: string | null;
  onboardingCompletedAt?: string | null;
  hasPrice: boolean;
  hasSocials: boolean;
  kycStatus?: string | null;
};

/**
 * Regra pura: dado o estado do perfil, devolve a rota do próximo passo do
 * onboarding de creator pago, ou `null` quando não há pendência.
 */
export function creatorOnboardingStepFrom(
  input: CreatorOnboardingInput,
): string | null {
  if (input.accountType !== "creator") return null;
  if (input.onboardingCompletedAt) return null;

  const kyc = input.kycStatus ?? "not_started";
  if (kyc === "processing") return "/creator/onboarding/documentos/verificando";
  if (kyc === "requires_input") return "/creator/onboarding/documentos";
  if (!input.hasPrice) {
    return input.hasSocials
      ? "/creator/onboarding/assinatura"
      : "/creator/onboarding/redes-sociais";
  }
  if (kyc === "not_started") return "/creator/onboarding/documentos";
  return null;
}

/**
 * Consulta o perfil do usuário logado e devolve a rota do próximo passo do
 * onboarding de creator, ou `null` (assinantes, free_creator e creators já
 * concluídos).
 */
export async function resolveCreatorOnboardingStep(): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profile }, { data: paidProfiles }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "account_type, onboarding_completed_at, price_monthly, kyc_status, instagram_handle, tiktok_handle, x_handle",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("creator_profiles")
      .select("price_monthly")
      .eq("user_id", user.id)
      .eq("kind", "paid"),
  ]);

  if (!profile) return null;

  const paidPrice = (paidProfiles ?? [])[0]?.price_monthly ?? null;

  return creatorOnboardingStepFrom({
    accountType: profile.account_type,
    onboardingCompletedAt: profile.onboarding_completed_at,
    hasPrice: (paidPrice ?? profile.price_monthly) != null,
    hasSocials:
      !!profile.instagram_handle || !!profile.tiktok_handle || !!profile.x_handle,
    kycStatus: profile.kyc_status,
  });
}
