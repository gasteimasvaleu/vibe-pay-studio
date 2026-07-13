import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";
import type { PaymentMethod } from "@/components/payments/PaymentModal";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  amountCents: number;
  loading?: boolean;
  onConfirm: (method: PaymentMethod) => void;
};

export function PaymentMethodDialog({
  open,
  onOpenChange,
  title,
  amountCents,
  loading,
  onConfirm,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("PIX");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Escolha a forma de pagamento</DialogDescription>
        <div className="rounded-2xl bg-card p-6 space-y-5 shadow-card">
          <header>
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-semibold">{brl.format(amountCents / 100)}</span>
            </p>
          </header>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Forma de pagamento
            </p>
            <PaymentMethodPicker value={method} onChange={setMethod} />
          </div>

          <Button
            onClick={() => onConfirm(method)}
            disabled={loading}
            className="w-full h-11 rounded-full bg-gradient-primary text-primary-foreground"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                {method === "PIX" ? "Gerando PIX..." : "Abrindo checkout..."}
              </>
            ) : (
              `Pagar ${brl.format(amountCents / 100)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
