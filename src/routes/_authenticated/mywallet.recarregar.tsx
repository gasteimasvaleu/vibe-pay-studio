import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Minus, Plus, Loader2, QrCode, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PixCheckout } from "@/components/payments/PixCheckout";
import { CardCheckout } from "@/components/payments/CardCheckout";
import { createWalletTopupPayment } from "@/lib/payments.functions";
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

type Method = "PIX" | "CREDIT_CARD";

type Checkout = {
  method: Method;
  paymentIntentId: string;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  invoiceUrl?: string | null;
};

function RecarregarPage() {
  const router = useRouter();
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState<Method>("PIX");
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const createTopup = useServerFn(createWalletTopupPayment);

  const dec = () => setAmount((a) => Math.max(MIN, a - STEP));
  const inc = () => setAmount((a) => Math.min(MAX, a + STEP));

  const amountCents = amount * 100;
  const minCents = PAYMENT_MIN_GROSS_CENTS[method];
  const belowMin = amountCents < minCents;

  const handleContinue = async () => {
    if (belowMin) {
      toast.error(`Valor mínimo para ${method === "PIX" ? "PIX" : "cartão"}: ${formatMinimum(method)}`);
      return;
    }
    setLoading(true);
    try {
      const res = await createTopup({ data: { amountCents, method } });
      if (method === "PIX") {
        if (!res.pixQrCode || !res.pixCopyPaste) throw new Error("Falha ao gerar QR Code PIX");
        setCheckout({
          method,
          paymentIntentId: res.paymentIntentId,
          pixQrCode: res.pixQrCode,
          pixCopyPaste: res.pixCopyPaste,
          invoiceUrl: res.invoiceUrl,
        });
      } else {
        if (!res.invoiceUrl) throw new Error("Falha ao abrir checkout do cartão");
        setCheckout({
          method,
          paymentIntentId: res.paymentIntentId,
          invoiceUrl: res.invoiceUrl,
        });
      }
    } catch (e: any) {
      toast.error(translatePaymentError(e, "Erro ao criar cobrança"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-card" />

      <header className="relative z-10 border-b border-border bg-card">
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

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8">
        {checkout ? (
          checkout.method === "PIX" ? (
            <PixCheckout
              paymentIntentId={checkout.paymentIntentId}
              pixQrCode={checkout.pixQrCode ?? ""}
              pixCopyPaste={checkout.pixCopyPaste ?? ""}
              invoiceUrl={checkout.invoiceUrl}
              onPaid={() => {
                toast.success("Recarga confirmada!");
                router.navigate({ to: "/mywallet" });
              }}
              onCancel={() => setCheckout(null)}
            />
          ) : (
            <CardCheckout
              paymentIntentId={checkout.paymentIntentId}
              invoiceUrl={checkout.invoiceUrl ?? ""}
              onPaid={() => {
                toast.success("Recarga confirmada!");
                router.navigate({ to: "/mywallet" });
              }}
              onCancel={() => setCheckout(null)}
            />
          )
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
              <span className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground tabular-nums">
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
              <div className="mt-3 grid grid-cols-2 gap-3">
                {([
                  { id: "PIX" as const, label: "PIX", hint: "Confirmação em segundos", icon: <QrCode className="h-4 w-4" /> },
                  { id: "CREDIT_CARD" as const, label: "Cartão", hint: "Checkout seguro Asaas", icon: <CreditCard className="h-4 w-4" /> },
                ]).map((opt) => {
                  const active = method === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMethod(opt.id)}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <span className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {opt.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
                        <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Resumo
              </h2>
              <div className="mt-2">
                <div className="flex justify-between items-center py-4 border-b border-border text-sm md:text-base font-semibold text-foreground">
                  <span>Método</span>
                  <span>{method === "PIX" ? "PIX" : "Cartão de crédito"}</span>
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
              {belowMin && (
                <p className="mt-2 text-xs text-destructive">
                  Valor abaixo do mínimo para {method === "PIX" ? "PIX" : "cartão"} ({formatMinimum(method)}).
                </p>
              )}
            </section>

            <Button
              onClick={handleContinue}
              disabled={loading || belowMin}
              className="mt-10 w-full h-12 rounded-md bg-gradient-primary text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {method === "PIX" ? "Gerando PIX..." : "Abrindo checkout..."}
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
