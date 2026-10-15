import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlatformCommission = {
  /** Percentual retido da plataforma em vendas de compradores no Brasil. */
  national: number;
  /** Percentual retido da plataforma em vendas de compradores de fora do Brasil. */
  international: number;
};

// Reserva usado enquanto a leitura não termina ou falha.
const FALLBACK: PlatformCommission = { national: 15, international: 20 };

function safePct(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 90 ? n : fallback;
}

/**
 * Percentuais de comissão vigentes (Configurações do Admin).
 * A leitura é permitida a qualquer usuário logado.
 */
export function usePlatformCommission() {
  const q = useQuery({
    queryKey: ["platform-commission"],
    queryFn: async (): Promise<PlatformCommission> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("commission_pct_national, commission_pct_international")
        .eq("id", true)
        .maybeSingle();
      if (error || !data) return FALLBACK;
      return {
        national: safePct(data.commission_pct_national, FALLBACK.national),
        international: safePct(data.commission_pct_international, FALLBACK.international),
      };
    },
    staleTime: 5 * 60_000,
  });

  return { commission: q.data ?? FALLBACK, isLoading: q.isLoading };
}
