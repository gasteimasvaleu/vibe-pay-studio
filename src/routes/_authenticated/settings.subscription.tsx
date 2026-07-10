import { useMemo, useState } from "react";
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/settings/subscription")({
  head: () => ({
    meta: [
      { title: "Valor da assinatura · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/entrar" });
  },
  component: SubscriptionPage,
});

const MIN = 19.9;
const MAX = 200;

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function SubscriptionPage() {
  const router = useRouter();
  const [monthly, setMonthly] = useState<number>(50);
  const [discountQ, setDiscountQ] = useState<number>(0);
  const [discountS, setDiscountS] = useState<number>(0);

  const quarterly = useMemo(
    () => monthly * 3 * (1 - discountQ / 100),
    [monthly, discountQ],
  );
  const semester = useMemo(
    () => monthly * 6 * (1 - discountS / 100),
    [monthly, discountS],
  );

  const monthlyValid = monthly >= MIN && monthly <= MAX;
  const discountsValid =
    discountQ >= 0 && discountQ <= 100 && discountS >= 0 && discountS <= 100;
  const canSave = monthlyValid && discountsValid;

  const handleSave = () => {
    if (!canSave) return;
    toast.info("Em breve");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border backdrop-blur-md bg-card/80">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Valor da assinatura
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-28 space-y-5">
        {/* Card resumo */}
        <section className="rounded-3xl bg-card p-6 md:p-8 shadow-card">
          <p className="text-sm text-muted-foreground">Assinatura Mensal</p>
          <p className="mt-1 text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            {formatBRL(monthly)}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Trimestral</p>
              <p className="mt-1 text-xl md:text-2xl font-bold text-foreground">
                {formatBRL(quarterly)}
              </p>
            </div>
            <div className="border-l border-border pl-4">
              <p className="text-sm text-muted-foreground">Semestral</p>
              <p className="mt-1 text-xl md:text-2xl font-bold text-foreground">
                {formatBRL(semester)}
              </p>
            </div>
          </div>
        </section>

        {/* Mensal */}
        <div>
          <div className="rounded-2xl bg-muted px-5 py-3">
            <label className="text-xs text-muted-foreground">
              Assinatura Mensal
            </label>
            <div className="flex items-center gap-1">
              <span className="text-base font-semibold text-foreground">
                R$
              </span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={MIN}
                max={MAX}
                value={Number.isFinite(monthly) ? monthly : ""}
                onChange={(e) => setMonthly(Number(e.target.value))}
                className="border-0 bg-transparent shadow-none h-8 px-1 text-base font-semibold focus-visible:ring-0"
              />
            </div>
          </div>
          <p className="mt-2 px-1 text-sm text-muted-foreground">
            Mínimo: {formatBRL(MIN)} - Máximo: {formatBRL(MAX)}
          </p>
        </div>

        {/* Descontos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DiscountField
            label="Desconto Trimestral"
            value={discountQ}
            onChange={setDiscountQ}
          />
          <DiscountField
            label="Desconto Semestral"
            value={discountS}
            onChange={setDiscountS}
          />
        </div>
      </main>

      {/* Barra fixa Salvar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full h-12 rounded-full text-base font-semibold"
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

function DiscountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-muted px-5 py-3">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="border-0 bg-transparent shadow-none h-8 px-1 text-base font-semibold focus-visible:ring-0"
        />
        <span className="text-base font-semibold text-muted-foreground">%</span>
      </div>
    </div>
  );
}
