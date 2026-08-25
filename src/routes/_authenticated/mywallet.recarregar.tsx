import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Minus, Plus, Loader2, QrCode, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PixCheckout } from "@/components/payments/PixCheckout";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";
import type { PaymentMethod } from "@/components/payments/PaymentModal";
import { createWalletTopupPayment } from "@/lib/payments.functions";
import { chargeSavedCardTopUp } from "@/lib/saved-cards.functions";
import {
  translatePaymentError,
  PAYMENT_MIN_GROSS_CENTS,
  formatMinimum,
} from "@/lib/payment-limits";


export const Route = createFileRoute("/_authenticated/mywallet/recarregar")({
  head: () => ({
    meta: [
      { title: "Recarregar carteira · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecarregarPage,
});

const MIN = 10;
const MAX = 1000;
const STEP = 10;
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type Checkout = {
  method: PaymentMethod;
  paymentIntentId: string;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
};

function RecarregarPage() {
  const router = useRouter();
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const createTopup = useServerFn(createWalletTopupPayment);
  const chargeSaved = useServerFn(chargeSavedCardTopUp);

  const dec = () => setAmount((a) => Math.max(MIN, a - STEP));
  const inc = () => setAmount((a) => Math.min(MAX, a + STEP));

  const amountCents = amount * 100;
  const minCents = PAYMENT_MIN_GROSS_CENTS[method === "WALLET" ? "PIX" : method];
  const belowMin = amountCents < minCents;

  const handleContinue = async () => {
    if (belowMin) {
      toast.error(`Valor mínimo para ${method === "PIX" ? "PIX" : "cartão"}: ${formatMinimum(method === "WALLET" ? "PIX" : method)}`);
      return;
    }
    setLoading(true);
    try {
      // Cobrança 1-click com cartão salvo (sem iframe/redirecionamento)
      if (method === "CREDIT_CARD" && savedCardId) {
        const res = await chargeSaved({ data: { savedCardId, amountCents } });
        const status = String(res.status ?? "").toUpperCase();
        if (["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(status)) {
          toast.success("Recarga confirmada!");
          router.navigate({ to: "/mywallet" });
        } else {
          toast.message("Pagamento em processamento. Você será notificado quando confirmar.");
          router.navigate({ to: "/mywallet" });
        }
        return;
      }

      const res = await createTopup({ data: { amountCents, method: method === "WALLET" ? "PIX" : method } });
      if (method === "PIX" || method === "WALLET") {
        if (!res.pixQrCode || !res.pixCopyPaste) throw new Error("Falha ao gerar QR Code PIX");
        setCheckout({
          method,
          paymentIntentId: res.paymentIntentId,
          pixQrCode: res.pixQrCode,
          pixCopyPaste: res.pixCopyPaste,
        });
      }
    } catch (e: any) {
      toast.error(translatePaymentError(e, "Erro ao criar cobrança"));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => (checkout ? setCheckout(null) : router.history.back())}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            {checkout ? "Pagamento" : "Recarregar carteira"}
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        {checkout ? (
          <PixCheckout
            paymentIntentId={checkout.paymentIntentId}
            pixQrCode={checkout.pixQrCode ?? ""}
            pixCopyPaste={checkout.pixCopyPaste ?? ""}
            onPaid={() => {
              toast.success("Recarga confirmada!");
              router.navigate({ to: "/mywallet" });
            }}
            onCancel={() => setCheckout(null)}
          />
        ) : (
          <>
            <div className="flex items-center justify-center gap-6 mt-8 md:mt-16">
              <button
                type="button"
                onClick={dec}
                disabled={amount <= MIN}
                aria-label="Diminuir"
                className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {currency.format(amount)}
              </span>
              <button
                type="button"
                onClick={inc}
                disabled={amount >= MAX}
                aria-label="Aumentar"
                className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8">
              <Slider
                value={[amount]}
                onValueChange={(v) => setAmount(v[0] ?? MIN)}
                min={MIN}
                max={MAX}
                step={STEP}
              />
            </div>

            <section className="mt-10">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Método de pagamento
              </h2>
              <div className="mt-3">
                <PaymentMethodPicker
                  value={method}
                  onChange={setMethod}
                  amountCents={amountCents}
                  savedCardId={savedCardId}
                  onSavedCardChange={setSavedCardId}
                />
              </div>
              {belowMin && (
                <p className="mt-2 text-xs text-destructive">
                  Valor abaixo do mínimo para {method === "PIX" || method === "WALLET" ? "PIX" : "cartão"} ({formatMinimum(method === "WALLET" ? "PIX" : method)}).
                </p>
              )}
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Resumo
              </h2>
              <div className="mt-2">
                <div className="flex justify-between items-center py-4 border-b border-border text-sm md:text-base font-semibold text-foreground">
                  <span>Método</span>
                  <span>{method === "PIX" || method === "WALLET" ? "PIX" : "Cartão de crédito"}</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-border text-sm md:text-base font-semibold text-foreground">
                  <span>Você adiciona</span>
                  <span>{currency.format(amount)}</span>
                </div>
                <div className="flex justify-between items-center py-4 text-sm md:text-base font-semibold text-foreground">
                  <span>Total a pagar</span>
                  <span>{currency.format(amount)}</span>
                </div>
              </div>
            </section>

            <Button
              onClick={handleContinue}
              disabled={loading || belowMin}
              className="mt-10 w-full rounded-md bg-gradient-primary text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {method === "CREDIT_CARD" ? "Processando cartão..." : "Gerando PIX..."}
                </>
              ) : (
                "Continuar"
              )}
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
