import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { getPaymentIntentStatus } from "@/lib/payments.functions";

type Props = {
  paymentIntentId: string;
  invoiceUrl: string;
  onPaid?: () => void;
  onCancel?: () => void;
};

const PAID_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];

export function CardCheckout({ paymentIntentId, invoiceUrl, onPaid, onCancel }: Props) {
  const [status, setStatus] = useState<string>("PENDING");
  const pollStatus = useServerFn(getPaymentIntentStatus);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await pollStatus({ data: { paymentIntentId } });
        if (cancelled) return;
        setStatus(res.status);
        if (PAID_STATUSES.includes(res.status)) {
          clearInterval(interval);
          onPaid?.();
        }
      } catch (e) {
        console.error(e);
      }
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [paymentIntentId, pollStatus, onPaid]);

  const isPaid = PAID_STATUSES.includes(status);

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
      <header>
        <h3 className="text-lg font-bold text-foreground">Pagamento com cartão</h3>
        <p className="text-sm text-muted-foreground">
          Abra o checkout seguro do Asaas para concluir. A tela atualiza sozinha após a confirmação.
        </p>
      </header>

      {isPaid ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Check className="h-10 w-10 text-primary" />
          <p className="font-semibold text-foreground">Pagamento confirmado!</p>
        </div>
      ) : (
        <>
          <a
            href={invoiceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-primary text-primary-foreground px-4 py-3 font-semibold hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir checkout novamente
          </a>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Aguardando confirmação do pagamento...
          </div>

          <p className="text-xs text-muted-foreground">
            Assim que o Asaas confirmar, esta tela atualiza automaticamente. Você pode
            fechar e a compra continua sendo processada.
          </p>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              Fechar
            </button>
          )}
        </>
      )}
    </div>
  );
}
