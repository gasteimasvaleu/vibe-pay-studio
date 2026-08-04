import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PixCheckout } from "@/components/payments/PixCheckout";
import { CardCheckout } from "@/components/payments/CardCheckout";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";
import type { PaymentMethod } from "@/components/payments/PaymentModal";
import { supabase } from "@/integrations/supabase/client";
import { createSubscriptionPayment } from "@/lib/payments.functions";
import { useWaitForPaymentSettled } from "@/lib/wait-for-payment";
import { payWithWallet } from "@/lib/wallet-pay.functions";
import { translatePaymentError } from "@/lib/payment-limits";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Plan = "monthly" | "quarterly" | "semiannual";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName?: string;
  initialPlan?: Plan;
  onCpfRequired?: () => void;
};

type Checkout = {
  paymentIntentId: string;
  method: PaymentMethod;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  invoiceUrl?: string | null;
};

export function SubscribeDialog({ open, onOpenChange, creatorId, creatorName, initialPlan = "monthly", onCpfRequired }: Props) {
  const [plan, setPlan] = useState<Plan>("monthly");
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const subscribe = useServerFn(createSubscriptionPayment);
  const waitForSettled = useWaitForPaymentSettled();
  const walletPay = useServerFn(payWithWallet);
  const queryClient = useQueryClient();

  const priceQuery = useQuery({
    queryKey: ["creator-price", creatorId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("price_monthly, discount_quarterly, discount_semiannual")
        .eq("user_id", creatorId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  useEffect(() => {
    if (open) {
      setPlan(initialPlan);
      setCheckout(null);
    } else {
      setCheckout(null);
      setPlan("monthly");
      setMethod("PIX");
    }
  }, [initialPlan, open]);

  const monthly = priceQuery.data?.price_monthly ?? 0;
  const discountQ = priceQuery.data?.discount_quarterly ?? 0;
  const discountS = priceQuery.data?.discount_semiannual ?? 0;

  const monthlyCents = Math.round(Number(monthly) * 100);
  const totals: Record<Plan, { months: number; cents: number; discount: number }> = {
    monthly: { months: 1, cents: monthlyCents, discount: 0 },
    quarterly: {
      months: 3,
      cents: Math.round(monthlyCents * 3 * (1 - discountQ / 100)),
      discount: discountQ,
    },
    semiannual: {
      months: 6,
      cents: Math.round(monthlyCents * 6 * (1 - discountS / 100)),
      discount: discountS,
    },
  };


  const submit = async (overrideCardId?: string) => {
    setLoading(true);
    try {
      if (method === "WALLET") {
        await walletPay({ data: { kind: "subscription", creatorId, plan } });
        toast.success("Assinatura ativada!");
        void queryClient.invalidateQueries({ queryKey: ["subscriber-wallet"] });
        onOpenChange(false);
        return;
      }
      const cardId = method === "CREDIT_CARD" ? (overrideCardId ?? savedCardId) : null;
      const res = await subscribe({
        data: { creatorId, plan, method, savedCardId: cardId },
      });
      if (res.paidImmediately) {
        toast.loading("Confirmando pagamento...", { id: "subscribe-pay" });
        await waitForSettled(res.paymentIntentId);
        toast.success("Assinatura ativada!", { id: "subscribe-pay" });
        void queryClient.invalidateQueries({ queryKey: ["subscriber-wallet"] });
        onOpenChange(false);
        return;
      }
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
      if (e?.message === "already_subscribed") {
        toast.info("Você já assina este criador");
        onOpenChange(false);
        return;
      }
      if (e?.message === "cpf_required") {
        onOpenChange(false);
        onCpfRequired?.();
        return;
      }
      toast.error(translatePaymentError(e, "Erro ao assinar"));
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">
        <DialogTitle className="sr-only">Assinar criador</DialogTitle>
        <DialogDescription className="sr-only">
          Escolha o plano de assinatura e a forma de pagamento
        </DialogDescription>
        {checkout ? (
          checkout.method === "CREDIT_CARD" && checkout.invoiceUrl ? (
            <CardCheckout
              paymentIntentId={checkout.paymentIntentId}
              invoiceUrl={checkout.invoiceUrl}
              onPaid={() => {
                toast.success("Assinatura ativada!");
                onOpenChange(false);
              }}
              onCancel={() => onOpenChange(false)}
            />
          ) : (
            <PixCheckout
              paymentIntentId={checkout.paymentIntentId}
              pixQrCode={checkout.pixQrCode ?? ""}
              pixCopyPaste={checkout.pixCopyPaste ?? ""}
              invoiceUrl={checkout.invoiceUrl}
              onPaid={() => {
                toast.success("Assinatura ativada!");
                onOpenChange(false);
              }}
              onCancel={() => onOpenChange(false)}
            />
          )
        ) : (
          <div className="rounded-2xl bg-card p-6 space-y-5 shadow-card">
            <header>
              <h3 className="text-lg font-bold text-foreground">
                Assinar {creatorName ?? "criador"}
              </h3>
              <p className="text-sm text-muted-foreground">Escolha um plano e forma de pagamento</p>
            </header>

            {priceQuery.isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Carregando planos...
              </div>
            ) : monthly <= 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Este criador ainda não configurou preços.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {(["monthly", "quarterly", "semiannual"] as Plan[]).map((p) => {
                    const t = totals[p];
                    const label =
                      p === "monthly" ? "Mensal" : p === "quarterly" ? "Trimestral" : "Semestral";
                    const monthlyEq = Math.round(t.cents / t.months);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlan(p)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                          plan === p
                            ? "border-primary bg-primary/5"
                            : "border-border bg-secondary hover:bg-accent"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {label}
                            {t.discount > 0 && (
                              <span className="ml-2 text-xs font-bold text-primary">
                                -{t.discount}%
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {brl.format(monthlyEq / 100)}/mês
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {brl.format(t.cents / 100)}
                          </span>
                          {plan === p && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Forma de pagamento
                  </p>
                  <PaymentMethodPicker value={method} onChange={setMethod} amountCents={totals[plan].cents} savedCardId={savedCardId} onSavedCardChange={setSavedCardId} onNewCardTokenized={(id) => submit(id)} />
                </div>

                <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Renovação manual.</strong>{" "}
                  Esta assinatura cobre apenas 1 ciclo — não há cobrança recorrente
                  automática. Enviamos um e-mail 7 dias antes do vencimento para você
                  renovar quando quiser.
                </div>


                <Button
                  onClick={() => submit()}
                  disabled={loading || totals[plan].cents <= 0}
                  className="w-full rounded-md bg-gradient-primary text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />{" "}
                      {method === "WALLET" ? "Debitando saldo..." : method === "PIX" ? "Gerando PIX..." : "Abrindo checkout..."}
                    </>
                  ) : (
                    `Pagar ${brl.format(totals[plan].cents / 100)}`
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
