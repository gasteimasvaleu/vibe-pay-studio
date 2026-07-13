import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPaymentIntentStatus } from "@/lib/payments.functions";
import { Copy, Check, Loader2 } from "lucide-react";

type Props = {
  paymentIntentId: string;
  pixQrCode: string; // base64 png
  pixCopyPaste: string;
  invoiceUrl?: string | null;
  onPaid?: () => void;
  onCancel?: () => void;
};

export function PixCheckout({
  paymentIntentId,
  pixQrCode,
  pixCopyPaste,
  invoiceUrl,
  onPaid,
  onCancel,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>("PENDING");
  const pollStatus = useServerFn(getPaymentIntentStatus);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await pollStatus({ data: { paymentIntentId } });
        if (cancelled) return;
        setStatus(res.status);
        if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(res.status)) {
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

  const copy = async () => {
    await navigator.clipboard.writeText(pixCopyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPaid = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status);

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
      <header>
        <h3 className="text-lg font-bold text-foreground">Pague com PIX</h3>
        <p className="text-sm text-muted-foreground">
          Escaneie o QR code ou copie o código abaixo
        </p>
      </header>

      {isPaid ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Check className="h-10 w-10 text-primary" />
          <p className="font-semibold text-foreground">Pagamento confirmado!</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center rounded-xl bg-white p-3">
            <img
              src={`data:image/png;base64,${pixQrCode}`}
              alt="QR Code PIX"
              className="h-56 w-56"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              PIX Copia e Cola
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={pixCopyPaste}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs font-mono"
              />
              <button
                type="button"
                onClick={copy}
                className="rounded-lg border bg-secondary px-3 py-2 hover:bg-accent"
                aria-label="Copiar código"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Aguardando pagamento...
          </div>

          {invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-sm text-primary hover:underline"
            >
              Abrir fatura no Asaas
            </a>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              Cancelar
            </button>
          )}
        </>
      )}
    </div>
  );
}
