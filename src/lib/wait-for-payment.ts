import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPaymentIntentStatus } from "@/lib/payments.functions";

const DEFAULT_TIMEOUT_MS = 40_000;
const DEFAULT_INTERVAL_MS = 2_000;

/**
 * Aguarda o servidor concluir a *reconciliação* do pagamento.
 *
 * A Asaas aprova o cartão na hora, mas o conteúdo só é liberado quando a
 * intenção de pagamento é marcada como processada (`processed_at`) — o que
 * acontece via webhook ou via este próprio polling, que dispara a
 * reconciliação quando percebe o pagamento confirmado.
 *
 * Retorna `true` quando a liberação foi confirmada, `false` no timeout.
 */
export function useWaitForPaymentSettled() {
  const poll = useServerFn(getPaymentIntentStatus);

  return useCallback(
    async (
      paymentIntentId: string,
      opts?: { timeoutMs?: number; intervalMs?: number },
    ): Promise<boolean> => {
      const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const intervalMs = opts?.intervalMs ?? DEFAULT_INTERVAL_MS;
      const deadline = Date.now() + timeoutMs;

      while (Date.now() < deadline) {
        try {
          const res = await poll({ data: { paymentIntentId } });
          if (res?.processedAt) return true;
        } catch (e) {
          console.error("[wait-for-payment]", e);
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      return false;
    },
    [poll],
  );
}
