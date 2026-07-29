import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, QrCode, Wallet } from "lucide-react";
import type { PaymentMethod } from "@/components/payments/PaymentModal";
import { getSubscriberWallet } from "@/lib/finance.functions";
import { PAYMENT_MIN_GROSS_CENTS, formatMinimum } from "@/lib/payment-limits";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  /**
   * Valor total da compra em centavos. Usado para desabilitar "Carteira"
   * quando o saldo é insuficiente e PIX/Cartão quando o valor está abaixo
   * do mínimo aceito pelo Asaas.
   */
  amountCents?: number;
  /** Variante visual — use "dark" sobre superfícies escuras (ex.: paywall de story). */
  tone?: "light" | "dark";
};

export function PaymentMethodPicker({ value, onChange, amountCents = 0, tone = "light" }: Props) {
  const fetchWallet = useServerFn(getSubscriberWallet);
  const walletQuery = useQuery({
    queryKey: ["subscriber-wallet"],
    queryFn: () => fetchWallet(),
    staleTime: 15_000,
  });

  const balance = walletQuery.data?.balanceCents ?? 0;
  const walletEnough = amountCents > 0 ? balance >= amountCents : balance > 0;

  const pixBelowMin = amountCents > 0 && amountCents < PAYMENT_MIN_GROSS_CENTS.PIX;
  const cardBelowMin = amountCents > 0 && amountCents < PAYMENT_MIN_GROSS_CENTS.CREDIT_CARD;

  const options: Array<{
    id: PaymentMethod;
    label: string;
    hint: string;
    icon: React.ReactNode;
    disabled?: boolean;
  }> = [
    {
      id: "WALLET",
      label: "Carteira",
      hint: walletQuery.isLoading
        ? "Carregando saldo..."
        : walletEnough
          ? `Saldo: ${brl.format(balance / 100)}`
          : `Saldo insuficiente (${brl.format(balance / 100)})`,
      icon: <Wallet className="h-4 w-4" />,
      disabled: !walletQuery.isLoading && !walletEnough,
    },
    {
      id: "PIX",
      label: "PIX",
      hint: pixBelowMin
        ? `Mínimo ${formatMinimum("PIX")}`
        : "Confirmação em segundos",
      icon: <QrCode className="h-4 w-4" />,
      disabled: pixBelowMin,
    },
    {
      id: "CREDIT_CARD",
      label: "Cartão",
      hint: cardBelowMin
        ? `Mínimo ${formatMinimum("CREDIT_CARD")}`
        : "Checkout seguro Asaas",
      icon: <CreditCard className="h-4 w-4" />,
      disabled: cardBelowMin,
    },
  ];

  const isDark = tone === "dark";
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => {
        const active = value === opt.id;
        const disabled = opt.disabled;
        const classes = isDark
          ? active
            ? "border-primary bg-primary/20 text-white"
            : disabled
              ? "border-white/10 bg-white/5 text-white/60 opacity-60 cursor-not-allowed"
              : "border-white/15 bg-white/5 text-white hover:bg-white/10"
          : active
            ? "border-primary bg-primary/5 text-foreground"
            : disabled
              ? "border-border bg-secondary/50 text-foreground opacity-60 cursor-not-allowed"
              : "border-border bg-secondary text-foreground hover:bg-accent";
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.id)}
            className={`rounded-xl border px-3 py-3 text-left transition-colors ${classes}`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {opt.icon}
              {opt.label}
            </div>
            <p className={`mt-0.5 text-[11px] leading-tight ${isDark ? "text-white/70" : "text-muted-foreground"}`}>{opt.hint}</p>
          </button>
        );
      })}
    </div>
  );
}
