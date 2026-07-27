import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PixCheckout } from "@/components/payments/PixCheckout";
import { CardCheckout } from "@/components/payments/CardCheckout";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";
import type { PaymentMethod } from "@/components/payments/PaymentModal";
import { createLiveTicketPayment } from "@/lib/payments.functions";
import { payWithWallet } from "@/lib/wallet-pay.functions";
import { PAYMENT_MIN_GROSS_CENTS, formatMinimum, translatePaymentError } from "@/lib/payment-limits";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveId: string;
  creatorName?: string;
  priceCents: number;
  onPaid?: () => void;
};

type Checkout = {
  paymentIntentId: string;
  method: PaymentMethod;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  invoiceUrl?: string | null;
};

export function LiveTicketDialog({ open, onOpenChange, liveId, creatorName, priceCents, onPaid }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const createTicket = useServerFn(createLiveTicketPayment);
  const walletPay = useServerFn(payWithWallet);
  const queryClient = useQueryClient();

  const handleClose = (v: boolean) => {
    if (!v) {
      setCheckout(null);
      setMethod("PIX");
    }
    onOpenChange(v);
  };

  const methodMinCents =
    method === "PIX" || method === "CREDIT_CARD" ? PAYMENT_MIN_GROSS_CENTS[method] : 0;
  const belowMethodMin = methodMinCents > 0 && priceCents < methodMinCents;
  const disableSubmit = loading || belowMethodMin;

  const finish = () => {
    toast.success("Acesso à live liberado!");
    onPaid?.();
    handleClose(false);
  };

  const submit = async () => {
    if (belowMethodMin && (method === "PIX" || method === "CREDIT_CARD")) {
      toast.error(`Valor mínimo para ${method === "PIX" ? "PIX" : "cartão"} é ${formatMinimum(method)}.`);
      return;
    }
    setLoading(true);
    try {
      if (method === "WALLET") {
        const res: any = await walletPay({
          data: { kind: "live_ticket", liveId, amountCents: priceCents },
        });
        if (res?.status === "paid" || res?.status === "already") {
          void queryClient.invalidateQueries({ queryKey: ["subscriber-wallet"] });
          finish();
        } else if (res?.status === "insufficient") {
          toast.error("Saldo insuficiente. Recarregue sua carteira.");
        } else {
          toast.error("Não foi possível pagar com saldo.");
        }
        return;
      }
      const res = await createTicket({ data: { liveId, method } });
      if (method === "PIX" && (!res.pixQrCode || !res.pixCopyPaste)) {
        throw new Error("Falha ao gerar PIX");
      }
      if (method === "CREDIT_CARD" && !res.invoiceUrl) {
        throw new Error("Falha ao abrir checkout de cartão");
      }
      setCheckout({
        paymentIntentId: res.paymentIntentId,
        method,
        pixQrCode: res.pixQrCode,
        pixCopyPaste: res.pixCopyPaste,
        invoiceUrl: res.invoiceUrl,
      });
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.includes("acesso_ja_liberado")) {
        finish();
        return;
      }
      toast.error(translatePaymentError(e, "Erro ao comprar acesso"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">
        <DialogTitle className="sr-only">Comprar acesso à live</DialogTitle>
        <DialogDescription className="sr-only">
          Escolha a forma de pagamento para liberar o acesso à live.
        </DialogDescription>
        {checkout ? (
          checkout.method === "CREDIT_CARD" && checkout.invoiceUrl ? (
            <CardCheckout
              paymentIntentId={checkout.paymentIntentId}
              invoiceUrl={checkout.invoiceUrl}
              onPaid={finish}
              onCancel={() => handleClose(false)}
            />
          ) : (
            <PixCheckout
              paymentIntentId={checkout.paymentIntentId}
              pixQrCode={checkout.pixQrCode ?? ""}
              pixCopyPaste={checkout.pixCopyPaste ?? ""}
              invoiceUrl={checkout.invoiceUrl ?? null}
              onPaid={finish}
              onCancel={() => handleClose(false)}
            />
          )
        ) : (
          <div className="rounded-2xl bg-card p-6 space-y-5 shadow-card">
            <header className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-fuchsia-500/15 text-fuchsia-500 grid place-items-center shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Comprar acesso {creatorName ? `à live de ${creatorName}` : "à live"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ticket único, vale enquanto a live estiver no ar.
                </p>
              </div>
            </header>

            <div className="text-center">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">
                {brl.format(priceCents / 100)}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Forma de pagamento
              </p>
              <PaymentMethodPicker value={method} onChange={setMethod} amountCents={priceCents} />
              {belowMethodMin && (method === "PIX" || method === "CREDIT_CARD") && (
                <p className="text-[11px] text-destructive">
                  Valor mínimo para {method === "PIX" ? "PIX" : "cartão"}: {formatMinimum(method)}
                </p>
              )}
            </div>

            <Button
              onClick={submit}
              disabled={disableSubmit}
              className="w-full rounded-md bg-gradient-primary text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {method === "WALLET"
                    ? "Debitando saldo..."
                    : method === "PIX"
                      ? "Gerando PIX..."
                      : "Abrindo checkout..."}
                </>
              ) : (
                `Pagar ${brl.format(priceCents / 100)}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
