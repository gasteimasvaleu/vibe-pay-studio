import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PixCheckout } from "@/components/payments/PixCheckout";
import { CardCheckout } from "@/components/payments/CardCheckout";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";
import type { PaymentMethod } from "@/components/payments/PaymentModal";
import { createTipPayment } from "@/lib/payments.functions";
import { payWithWallet } from "@/lib/wallet-pay.functions";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PRESETS = [10, 20, 50, 100];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName?: string;
  publicationId?: string;
};

type Checkout = {
  paymentIntentId: string;
  method: PaymentMethod;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  invoiceUrl?: string | null;
};

export function TipDialog({ open, onOpenChange, creatorId, creatorName, publicationId }: Props) {
  const [amount, setAmount] = useState(20);
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const createTip = useServerFn(createTipPayment);
  const walletPay = useServerFn(payWithWallet);
  const queryClient = useQueryClient();

  const handleClose = (v: boolean) => {
    if (!v) {
      setCheckout(null);
      setMessage("");
      setAmount(20);
      setMethod("PIX");
    }
    onOpenChange(v);
  };

  const submit = async () => {
    if (amount < 5) {
      toast.error("Valor mínimo é R$ 5,00");
      return;
    }
    setLoading(true);
    try {
      if (method === "WALLET") {
        await walletPay({
          data: {
            kind: "tip",
            creatorId,
            publicationId,
            amountCents: amount * 100,
            message: message.trim() || undefined,
          },
        });
        toast.success("Gorjeta enviada!");
        void queryClient.invalidateQueries({ queryKey: ["subscriber-wallet"] });
        handleClose(false);
        return;
      }
      const res = await createTip({
        data: {
          creatorId,
          amountCents: amount * 100,
          method,
          publicationId,
          message: message.trim() || undefined,
        },
      });
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
      if (e?.message === "insufficient_funds") {
        toast.error("Saldo insuficiente na carteira");
        return;
      }
      toast.error(e?.message ?? "Erro ao criar tip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">
        <DialogTitle className="sr-only">Enviar gorjeta</DialogTitle>
        <DialogDescription className="sr-only">
          Envie uma gorjeta ao criador via PIX ou cartão
        </DialogDescription>
        {checkout ? (
          checkout.method === "CREDIT_CARD" && checkout.invoiceUrl ? (
            <CardCheckout
              paymentIntentId={checkout.paymentIntentId}
              invoiceUrl={checkout.invoiceUrl}
              onPaid={() => {
                toast.success("Gorjeta enviada!");
                handleClose(false);
              }}
              onCancel={() => handleClose(false)}
            />
          ) : (
            <PixCheckout
              paymentIntentId={checkout.paymentIntentId}
              pixQrCode={checkout.pixQrCode ?? ""}
              pixCopyPaste={checkout.pixCopyPaste ?? ""}
              invoiceUrl={checkout.invoiceUrl}
              onPaid={() => {
                toast.success("Gorjeta enviada!");
                handleClose(false);
              }}
              onCancel={() => handleClose(false)}
            />
          )
        ) : (
          <div className="rounded-2xl bg-card p-6 space-y-5 shadow-card">
            <header>
              <h3 className="text-lg font-bold text-foreground">
                Gorjeta {creatorName ? `para ${creatorName}` : ""}
              </h3>
              <p className="text-sm text-muted-foreground">Valor mínimo R$ 5,00</p>
            </header>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setAmount((a) => Math.max(5, a - 5))}
                className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center"
                aria-label="Diminuir"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="text-4xl font-extrabold tabular-nums text-foreground">
                {brl.format(amount)}
              </span>
              <button
                type="button"
                onClick={() => setAmount((a) => a + 5)}
                className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center"
                aria-label="Aumentar"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-center gap-2">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    amount === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-border"
                  }`}
                >
                  {brl.format(v)}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 300))}
              placeholder="Mensagem (opcional)"
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none"
            />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Forma de pagamento
              </p>
              <PaymentMethodPicker value={method} onChange={setMethod} amountCents={amount * 100} />
            </div>

            <Button
              onClick={submit}
              disabled={loading}
              className="w-full h-11 rounded-full bg-gradient-primary text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                  {method === "WALLET" ? "Debitando saldo..." : method === "PIX" ? "Gerando PIX..." : "Abrindo checkout..."}
                </>
              ) : (
                `Enviar ${brl.format(amount)}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
