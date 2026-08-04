import type { QueryClient } from "@tanstack/react-query";

/**
 * Atualização automática pós-pagamento.
 *
 * Refaz as queries indicadas e, opcionalmente, repete a busca até que a
 * condição `until` seja satisfeita (o servidor pode levar alguns instantes
 * para refletir a reconciliação do pagamento). Evita que o usuário precise
 * recarregar a página para ver o conteúdo liberado.
 */
export async function refreshAfterPayment(
  queryClient: QueryClient,
  keys: string[],
  opts?: {
    /** Retorna true quando o dado já reflete o pagamento. */
    until?: () => boolean;
    attempts?: number;
    delayMs?: number;
  },
): Promise<boolean> {
  const attempts = opts?.attempts ?? 8;
  const delayMs = opts?.delayMs ?? 1500;

  for (let i = 0; i < attempts; i++) {
    await Promise.all(
      keys.map((key) =>
        queryClient.refetchQueries({ queryKey: [key], type: "active" }),
      ),
    );
    if (!opts?.until || opts.until()) return true;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}
