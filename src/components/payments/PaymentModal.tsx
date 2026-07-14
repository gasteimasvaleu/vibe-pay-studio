import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PixCheckout } from "@/components/payments/PixCheckout";
import { CardCheckout } from "@/components/payments/CardCheckout";

export type PaymentMethod = "PIX" | "CREDIT_CARD" | "WALLET";

export type CheckoutData = {
  paymentIntentId: string;
  method?: PaymentMethod;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  invoiceUrl?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  checkout: CheckoutData | null;
  onPaid?: () => void;
};

export function PaymentModal({
  open,
  onOpenChange,
  title = "Pagamento",
  checkout,
  onPaid,
}: Props) {
  const isCard = checkout?.method === "CREDIT_CARD";
  const hasPix = checkout?.pixQrCode && checkout?.pixCopyPaste;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {checkout && isCard && checkout.invoiceUrl ? (
          <CardCheckout
            paymentIntentId={checkout.paymentIntentId}
            invoiceUrl={checkout.invoiceUrl}
            onPaid={() => {
              onPaid?.();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : checkout && hasPix ? (
          <PixCheckout
            paymentIntentId={checkout.paymentIntentId}
            pixQrCode={checkout.pixQrCode!}
            pixCopyPaste={checkout.pixCopyPaste!}
            invoiceUrl={checkout.invoiceUrl ?? null}
            onPaid={() => {
              onPaid?.();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
            Preparando pagamento...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
