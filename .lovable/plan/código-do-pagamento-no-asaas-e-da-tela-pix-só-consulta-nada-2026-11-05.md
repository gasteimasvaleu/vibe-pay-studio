# Código do pagamento no Asaas e da tela Pix (só consulta, nada muda no app)

## 1. Montagem do pedido ao Asaas (`src/lib/asaas.server.ts`)

```ts
export type AsaasBillingType = "PIX" | "CREDIT_CARD" | "BOLETO" | "UNDEFINED";

export type CreditCardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type CreditCardHolderInfo = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone?: string;
};

export async function createPayment(input: {
  customerId: string;
  billingType: AsaasBillingType;
  amountCents: number;
  description: string;
  externalReference?: string;
  dueDate?: string; // yyyy-MM-dd
  creatorWalletId?: string | null;
  netCreatorCents?: number | null;
  creditCard?: CreditCardInput;
  creditCardHolderInfo?: CreditCardHolderInfo;
  creditCardToken?: string;
  remoteIp?: string;
}): Promise<AsaasPayment> {
  const due = input.dueDate ?? new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    value: centsToBrl(input.amountCents),
    dueDate: due,
    description: sanitizeAsaasText(input.description, 60),
    externalReference: input.externalReference,
  };

  if (input.creatorWalletId) {
    const platformWalletId = await getPlatformWalletId();
    if (!platformWalletId || platformWalletId !== input.creatorWalletId) {
      if (input.netCreatorCents == null || input.netCreatorCents <= 0) {
        throw new Error("netCreatorCents obrigatório para split de creator");
      }
      body.split = [
        { walletId: input.creatorWalletId, fixedValue: centsToBrl(input.netCreatorCents) },
      ];
    }
  }

  if (input.billingType === "CREDIT_CARD") {
    if (input.creditCardToken) {
      body.creditCardToken = input.creditCardToken;
    } else if (input.creditCard && input.creditCardHolderInfo) {
      body.creditCard = input.creditCard;
      body.creditCardHolderInfo = input.creditCardHolderInfo;
      if (input.remoteIp) body.remoteIp = input.remoteIp;
    } else {
      throw new Error("Cartão requer creditCardToken ou creditCard+creditCardHolderInfo");
    }
  }

  return asaasFetch<AsaasPayment>("/payments", { method: "POST", body: JSON.stringify(body) });
}

export type AsaasPixQr = { encodedImage: string; payload: string; expirationDate?: string };
// getPixQrCode(id) -> GET /payments/{id}/pixQrCode
```

## 2. Janela de pagamento (`src/components/payments/PaymentModal.tsx`)

```tsx
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PixCheckout } from "@/components/payments/PixCheckout";
import { CardProcessingStep } from "@/components/payments/CardProcessingStep";

export type PaymentMethod = "PIX" | "CREDIT_CARD" | "WALLET";
export type CheckoutData = {
  paymentIntentId: string;
  method?: PaymentMethod;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  invoiceUrl?: string | null;
};

export function PaymentModal({ open, onOpenChange, title = "Pagamento", checkout, onPaid }: {
  open: boolean; onOpenChange: (o: boolean) => void; title?: string;
  checkout: CheckoutData | null; onPaid?: () => void;
}) {
  const isCard = checkout?.method === "CREDIT_CARD";
  const hasPix = checkout?.pixQrCode && checkout?.pixCopyPaste;
  const done = () => { onPaid?.(); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {checkout && isCard ? (
          <CardProcessingStep paymentIntentId={checkout.paymentIntentId} onPaid={done} onCancel={() => onOpenChange(false)} />
        ) : checkout && hasPix ? (
          <PixCheckout
            paymentIntentId={checkout.paymentIntentId}
            pixQrCode={checkout.pixQrCode!}
            pixCopyPaste={checkout.pixCopyPaste!}
            invoiceUrl={checkout.invoiceUrl ?? null}
            onPaid={done}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">Preparando pagamento...</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

## 3. Tela do Pix (`src/components/payments/PixCheckout.tsx`)

```tsx
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPaymentIntentStatus } from "@/lib/payments.functions";
import { Copy, Check, Loader2 } from "lucide-react";

const PAID = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];

export function PixCheckout({ paymentIntentId, pixQrCode, pixCopyPaste, invoiceUrl, onPaid, onCancel }: {
  paymentIntentId: string; pixQrCode: string; pixCopyPaste: string;
  invoiceUrl?: string | null; onPaid?: () => void; onCancel?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("PENDING");
  const pollStatus = useServerFn(getPaymentIntentStatus);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await pollStatus({ data: { paymentIntentId } });
        if (cancelled) return;
        setStatus(res.status);
        if (PAID.includes(res.status)) { clearInterval(interval); onPaid?.(); }
      } catch (e) { console.error(e); }
    }, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [paymentIntentId, pollStatus, onPaid]);

  const copy = async () => {
    await navigator.clipboard.writeText(pixCopyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
      <header>
        <h3 className="text-lg font-bold text-foreground">Pague com PIX</h3>
        <p className="text-sm text-muted-foreground">Escaneie o QR code ou copie o código abaixo</p>
      </header>
      {PAID.includes(status) ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Check className="h-10 w-10 text-primary" />
          <p className="font-semibold text-foreground">Pagamento confirmado!</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center rounded-xl bg-white p-3">
            <img src={`data:image/png;base64,${pixQrCode}`} alt="QR Code PIX" className="h-56 w-56" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">PIX Copia e Cola</label>
            <div className="flex gap-2">
              <input readOnly value={pixCopyPaste} className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs font-mono" />
              <button type="button" onClick={copy} aria-label="Copiar código" className="rounded-lg border bg-secondary px-3 py-2 hover:bg-accent">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Aguardando pagamento...
          </div>
          {invoiceUrl && (
            <a href={invoiceUrl} target="_blank" rel="noreferrer" className="block text-center text-sm text-primary hover:underline">Abrir fatura no Asaas</a>
          )}
          {onCancel && (
            <button type="button" onClick={onCancel} className="w-full rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-accent">Cancelar</button>
          )}
        </>
      )}
    </div>
  );
}
```

A tela de escolha da forma de pagamento (`PaymentMethodPicker.tsx`, 245 linhas) não está aqui. Se quiser, mando ela também.
