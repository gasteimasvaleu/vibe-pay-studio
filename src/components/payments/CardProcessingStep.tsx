import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { getPaymentIntentStatus } from "@/lib/payments.functions";
import { cn } from "@/lib/utils";

type Props = {
  paymentIntentId: string;
  onPaid?: () => void;
  onCancel?: () => void;
};

const PAID_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
const FAILED_STATUSES = ["REFUSED", "REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"];

type Phase = "processing" | "confirming" | "done" | "error";

export function CardProcessingStep({ paymentIntentId, onPaid, onCancel }: Props) {
  const [phase, setPhase] = useState<Phase>("processing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollStatus = useServerFn(getPaymentIntentStatus);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        const res = await pollStatus({ data: { paymentIntentId } });
        if (cancelled) return;
        if (PAID_STATUSES.includes(res.status)) {
          setPhase("done");
          setTimeout(() => onPaid?.(), 800);
          return true;
        }
        if (FAILED_STATUSES.includes(res.status)) {
          setPhase("error");
          setErrorMsg("Pagamento recusado pela operadora.");
          return true;
        }
        if (attempts > 2) setPhase("confirming");
        return false;
      } catch (e) {
        console.error(e);
        return false;
      }
    };

    void tick();
    const interval = setInterval(async () => {
      const done = await tick();
      if (done) clearInterval(interval);
      // Timeout after ~60s
      if (attempts > 20) {
        clearInterval(interval);
        if (!cancelled) {
          setPhase("error");
          setErrorMsg("Ainda estamos confirmando. Recarregue em instantes para conferir.");
        }
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [paymentIntentId, pollStatus, onPaid]);

  const steps: Array<{ key: Phase; label: string }> = [
    { key: "processing", label: "Processando cartão" },
    { key: "confirming", label: "Confirmando com o banco" },
    { key: "done", label: "Pagamento aprovado" },
  ];

  const activeIdx =
    phase === "error"
      ? -1
      : phase === "done"
        ? 2
        : phase === "confirming"
          ? 1
          : 0;

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-card">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Pagamento com cartão</h3>
          <p className="text-xs text-muted-foreground">
            Estamos confirmando com a operadora. Não feche esta janela.
          </p>
        </div>
      </header>

      {phase === "error" ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-foreground text-center">
            {errorMsg ?? "Não foi possível confirmar o pagamento."}
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {steps.map((s, i) => {
            const isDone = i < activeIdx || phase === "done";
            const isActive = i === activeIdx && phase !== "done";
            return (
              <li key={s.key} className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full grid place-items-center border transition-colors",
                    isDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm",
                    isDone || isActive ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {(phase === "error" || phase === "done") && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
        >
          Fechar
        </button>
      )}
    </div>
  );
}
