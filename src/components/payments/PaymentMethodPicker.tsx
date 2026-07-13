import { CreditCard, QrCode } from "lucide-react";
import type { PaymentMethod } from "@/components/payments/PaymentModal";

type Props = {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
};

export function PaymentMethodPicker({ value, onChange }: Props) {
  const options: Array<{ id: PaymentMethod; label: string; hint: string; icon: React.ReactNode }> =
    [
      {
        id: "PIX",
        label: "PIX",
        hint: "Confirmação em segundos",
        icon: <QrCode className="h-4 w-4" />,
      },
      {
        id: "CREDIT_CARD",
        label: "Cartão",
        hint: "Checkout seguro Asaas",
        icon: <CreditCard className="h-4 w-4" />,
      },
    ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-xl border px-3 py-3 text-left transition-colors ${
              active
                ? "border-primary bg-primary/5"
                : "border-border bg-secondary hover:bg-accent"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {opt.icon}
              {opt.label}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{opt.hint}</p>
          </button>
        );
      })}
    </div>
  );
}
