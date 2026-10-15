// Comissão da plataforma: a fonte da verdade é a tabela platform_settings,
// editável em Configurações do Admin. Este módulo só lê o percentual vigente
// para o comprador da vez (nacional x internacional).
//
// O número fixo em `asaas.server.ts` (PLATFORM_COMMISSION_PCT) continua sendo o
// reserva usado quando a leitura falha, para nunca travar uma cobrança.
import type { supabase as SupabaseClientType } from "@/integrations/supabase/client";
import { PLATFORM_COMMISSION_PCT } from "@/lib/asaas.server";

const FALLBACK_COMMISSION_PCT = PLATFORM_COMMISSION_PCT;

// Brasil em suas variações de cadastro.
const NATIONAL_CODES = new Set(["BR", "BRA", "BRAZIL", "BRASIL"]);

/** true quando o país do cadastro está preenchido e não é o Brasil. */
export function isInternationalCountry(country: string | null | undefined): boolean {
  const code = (country ?? "").trim().toUpperCase();
  if (!code) return false;
  return !NATIONAL_CODES.has(code);
}

/**
 * Percentual de comissão que deve ser aplicado a uma compra feita por `buyerId`.
 * Usa o cliente do próprio usuário (RLS permite a leitura) e devolve o valor de
 * reserva quando não consegue ler a configuração.
 */
export async function getCommissionPct(
  supabase: SupabaseClientType,
  buyerId: string,
): Promise<number> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("country")
    .eq("user_id", buyerId)
    .maybeSingle();

  const international = isInternationalCountry(profile?.country);

  const { data: pct, error } = await supabase.rpc("platform_commission_pct", {
    _international: international,
  });

  if (
    error ||
    typeof pct !== "number" ||
    !Number.isFinite(pct) ||
    pct < 0 ||
    pct > 90
  ) {
    return FALLBACK_COMMISSION_PCT;
  }

  return pct;
}
