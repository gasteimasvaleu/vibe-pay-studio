import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { saveSubscriptionPricing } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/creator/onboarding/assinatura")({
  head: () => ({
    meta: [
      { title: "Preço de Assinatura · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssinaturaPage,
});

const MIN = 19.9;
const MAX = 200;

function parseBRL(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AssinaturaPage() {
  const navigate = useNavigate();
  const saveFn = useServerFn(saveSubscriptionPricing);
  const [monthlyRaw, setMonthlyRaw] = useState("");
  const [dq, setDq] = useState("0");
  const [ds, setDs] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSim, setShowSim] = useState(false);

  const monthly = parseBRL(monthlyRaw);
  const discountQ = Math.max(0, Math.min(90, parseInt(dq || "0", 10) || 0));
  const discountS = Math.max(0, Math.min(90, parseInt(ds || "0", 10) || 0));

  const prices = useMemo(() => {
    const q = monthly * 3 * (1 - discountQ / 100);
    const s = monthly * 6 * (1 - discountS / 100);
    return { monthly, quarterly: q, semiannual: s };
  }, [monthly, discountQ, discountS]);

  const valid = monthly >= MIN && monthly <= MAX;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!valid) {
      setError(`O valor mensal deve estar entre R$ ${formatBRL(MIN)} e R$ ${formatBRL(MAX)}.`);
      return;
    }
    setSaving(true);
    try {
      await saveFn({
        data: {
          price_monthly: Number(monthly.toFixed(2)),
          discount_quarterly: discountQ,
          discount_semiannual: discountS,
        },
      });
      navigate({ to: "/creator/onboarding/documentos" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell title="Assinatura" step={2} backTo="/creator/onboarding/redes-sociais">
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900">
          Defina o valor de assinatura dos seus conteúdos
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Não se preocupe, você pode alterar o valor da assinatura mais tarde.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <MoneyField
            label="Assinatura Mensal"
            value={monthlyRaw}
            onChange={setMonthlyRaw}
            invalid={monthlyRaw !== "" && !valid}
            autoFocus
          />
          <p className="text-xs text-neutral-500">
            Mínimo: R$ {formatBRL(MIN)} — Máximo: R$ {formatBRL(MAX)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <PercentField label="Desconto Trimestral" value={dq} onChange={setDq} />
            <PercentField label="Desconto Semestral" value={ds} onChange={setDs} />
          </div>

          <h3 className="pt-4 mb-3 text-sm font-semibold text-neutral-800">
            Como ficam seus planos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PriceCard label="Mensal" value={prices.monthly} highlight={valid} />
            <PriceCard label="Trimestral" value={prices.quarterly} highlight={valid} />
            <PriceCard label="Semestral" value={prices.semiannual} highlight={valid} />
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowSim((s) => !s)}
              className="text-sm font-medium text-fuchsia-600 hover:text-fuchsia-700 underline underline-offset-4"
            >
              Simular ganhos com assinatura
            </button>
            {showSim && (
              <div className="mt-4 mx-auto max-w-md text-left rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-700">
                <p className="font-semibold text-neutral-900">Estimativa (mock)</p>
                <p className="mt-2 text-neutral-600">
                  Com <b className="text-neutral-900">100 assinantes/mês</b> no plano mensal:
                </p>
                <p className="mt-1 text-xl font-black text-fuchsia-600">
                  R$ {formatBRL(prices.monthly * 100 * 0.8)}
                  <span className="text-xs font-normal text-neutral-500"> /mês líquido (20% taxa)</span>
                </p>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          {!valid && monthlyRaw !== "" && (
            <p className="text-xs text-neutral-600 text-center">
              Digite um valor entre R$ {formatBRL(MIN)} e R$ {formatBRL(MAX)} para continuar.
            </p>
          )}

          <button
            type="submit"
            disabled={!valid || saving}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-400 text-white font-semibold shadow-glow hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando..." : "Avançar"}
          </button>
        </form>
      </div>
    </OnboardingShell>
  );
}

function PriceCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 text-center transition-colors ${
        highlight
          ? "border-fuchsia-400 bg-fuchsia-50"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <p className="text-sm font-semibold text-neutral-700">{label}</p>
      <p className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-neutral-900">
        <span className="text-sm font-semibold align-top text-neutral-500 mr-1">R$</span>
        {formatBRL(value)}
      </p>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  invalid,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white px-5 py-3 transition-colors ${
        invalid ? "border-red-500" : "border-neutral-200 focus-within:border-fuchsia-500"
      }`}
    >
      <label className="block text-xs text-neutral-500">{label}</label>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold text-neutral-500">R$</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Ex: 29,90"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value.replace(/[^\d,.]/g, ""))}
          className="flex-1 bg-transparent outline-none text-lg font-semibold text-neutral-900 placeholder:text-neutral-400"
        />
      </div>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 focus-within:border-fuchsia-500 transition-colors">
      <label className="block text-xs text-neutral-500">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={90}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          className="flex-1 bg-transparent outline-none text-base font-semibold text-neutral-900"
        />
        <span className="text-sm text-neutral-500">%</span>
      </div>
    </div>
  );
}
