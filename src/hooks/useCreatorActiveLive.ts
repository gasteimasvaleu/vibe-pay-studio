import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCreatorActiveLive } from "@/lib/lives.functions";

/**
 * Retorna a live ativa (id) do criador, ou null. Usado para renderizar
 * a badge "LIVE" no avatar do perfil e o botão de entrada rápida.
 */
export function useCreatorActiveLive(creatorId: string | null | undefined) {
  const fn = useServerFn(getCreatorActiveLive);
  return useQuery({
    queryKey: ["creator-active-live", creatorId],
    queryFn: () => fn({ data: { creatorId: creatorId! } }),
    enabled: !!creatorId,
    refetchInterval: 20000,
    staleTime: 15000,
  });
}
