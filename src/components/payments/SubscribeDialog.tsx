import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PixCheckout } from "@/components/payments/PixCheckout";
import { supabase } from "@/integrations/supabase/client";
import { createSubscriptionPayment } from "@/lib/payments.functions";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Plan = "monthly" | "quarterly" | "semiannual";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName?: string;
};

type Checkout = {
  paymentIntentId: string;
  pixQrCode: string;
  pixCopyPaste: string;
  invoiceUrl?: string | null;
};

export function SubscribeDialog({ open, onOpenChange, creatorId, creatorName }: Props) {
  const [plan, setPlan] = useState<Plan>("monthly");
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const subscribe = useServerFn(createSubscriptionPayment);

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
    if (!open) {
      setCheckout(null);
      setPlan("monthly");
    }
  }, [open]);

  const monthly = priceQuery.data?.price_monthly ?? 0;
  const discountQ = priceQuery.data?.discount_quarterly ?? 0;
  const discountS = priceQuery.data?.discount_semiannual ?? 0;

  const totals: Record<Plan, { months: number; cents: number; discount: number }> = {
    monthly: { months: 1, cents: monthly, discount: 0 },
    quarterly: {
      months: 3,
      cents: Math.round(monthly * 3 * (1 - discountQ / 100)),
      discount: discountQ,
    },
    semiannual: {
      months: 6,
      cents: Math.round(monthly * 6 * (1 - discountS / 100)),
      discount: discountS,
    },
  };

  const submit = async () => {
    setLoading(true);
    try {
      const res = await subscribe({
        data: { creatorId, plan, method: "PIX" },
      });
      if (!res.pixQrCode || !res.pixCopyPaste) throw new Error("Falha ao gerar PIX");
      setCheckout({
        paymentIntentId: res.paymentIntentId,
        pixQrCode: res.pixQrCode,
        pixCopyPaste: res.pixCopyPaste,
        invoiceUrl: res.invoiceUrl,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao assinar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">
        <DialogTitle className="sr-only">Assinar criador</DialogTitle>
        <DialogDescription className="sr-only">
          Escolha o plano de assinatura e pague via PIX
        </DialogDescription>
        {checkout ? (
          <PixCheckout
            paymentIntentId={checkout.paymentIntentId}
            pixQrCode={checkout.pixQrCode}
            pixCopyPaste={checkout.pixCopyPaste}
            invoiceUrl={checkout.invoiceUrl}
            onPaid={() => {
              toast.success("Assinatura ativada!");
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <div className="rounded-2xl bg-card p-6 space-y-5 shadow-card">
            <header>
              <h3 className="text-lg font-bold text-foreground">
                Assinar {creatorName ?? "criador"}
              </h3>
              <p className="text-sm text-muted-foreground">Escolha um plano — pagamento via PIX</p>
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

                <Button
                  onClick={submit}
                  disabled={loading || totals[plan].cents <= 0}
                  className="w-full h-11 rounded-full bg-gradient-primary text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando PIX...
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
