import { useCallback, useRef, useState } from "react";

/**
 * Envolve uma ação de pagamento. Se a ação falha com `cpf_required`,
 * armazena os args para retry e sinaliza para abrir o CpfPromptDialog.
 *
 * Uso:
 *   const guard = useCpfGuard();
 *   const run = () => guard.run(async () => await pay({ data: {...} }));
 *   ...
 *   <CpfPromptDialog open={guard.needsCpf} onOpenChange={guard.close} onSaved={guard.retry} />
 */
export function useCpfGuard() {
  const [needsCpf, setNeedsCpf] = useState(false);
  const pending = useRef<null | (() => Promise<unknown>)>(null);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (e: any) {
      if (e?.message === "cpf_required" || /cpf_required/.test(String(e?.message ?? ""))) {
        pending.current = fn as any;
        setNeedsCpf(true);
        return undefined;
      }
      throw e;
    }
  }, []);

  const retry = useCallback(async () => {
    const fn = pending.current;
    pending.current = null;
    setNeedsCpf(false);
    if (fn) await fn();
  }, []);

  const close = useCallback((v: boolean) => {
    if (!v) {
      pending.current = null;
      setNeedsCpf(false);
    }
  }, []);

  return { needsCpf, run, retry, close };
}
