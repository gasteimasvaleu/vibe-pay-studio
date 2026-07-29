import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, QrCode, Wallet, Plus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { PaymentMethod } from "@/components/payments/PaymentModal";
import { getSubscriberWallet } from "@/lib/finance.functions";
import { listSavedCards, type SavedCardDTO } from "@/lib/saved-cards.functions";
import { PAYMENT_MIN_GROSS_CENTS, formatMinimum } from "@/lib/payment-limits";
import { NewCardCheckoutStep } from "@/components/payments/NewCardCheckoutStep";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  amountCents?: number;
  tone?: "light" | "dark";
  /** Controle opcional para seleção de cartão salvo (cobrança 1-click). */
  savedCardId?: string | null;
  onSavedCardChange?: (id: string | null) => void;
  /**
   * Callback chamado após tokenização bem-sucedida de um novo cartão.
   * Se presente, o dialog só fecha após esse callback resolver,
   * permitindo encadear tokenização + cobrança 1-click no mesmo clique.
   */
  onNewCardTokenized?: (savedCardId: string) => void | Promise<void>;
};

export function PaymentMethodPicker({
  value,
  onChange,
  amountCents = 0,
  tone = "light",
  savedCardId,
  onSavedCardChange,
  onNewCardTokenized,
}: Props) {
  const fetchWallet = useServerFn(getSubscriberWallet);
  const walletQuery = useQuery({
    queryKey: ["subscriber-wallet"],
    queryFn: () => fetchWallet(),
    staleTime: 15_000,
  });

  const fetchSavedCards = useServerFn(listSavedCards);
  const cardsQuery = useQuery({
    queryKey: ["saved-cards"],
    queryFn: () => fetchSavedCards(),
    staleTime: 30_000,
    enabled: !!onSavedCardChange,
  });
  const savedCards: SavedCardDTO[] = cardsQuery.data ?? [];
  const [addOpen, setAddOpen] = useState(false);

  // Auto-selecionar primeiro cartão salvo quando o método muda para CREDIT_CARD
  useEffect(() => {
    if (value !== "CREDIT_CARD" || !onSavedCardChange) return;
    if (savedCardId != null) return;
    if (savedCards.length > 0) onSavedCardChange(savedCards[0].id);
  }, [value, savedCards, savedCardId, onSavedCardChange]);

  // Abre automaticamente o formulário quando o usuário escolhe CARTÃO sem ter nenhum salvo
  useEffect(() => {
    if (value !== "CREDIT_CARD" || !onSavedCardChange) return;
    if (cardsQuery.isLoading) return;
    if (savedCards.length === 0 && !addOpen) setAddOpen(true);
  }, [value, cardsQuery.isLoading, savedCards.length, addOpen, onSavedCardChange]);

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
      hint: pixBelowMin ? `Mínimo ${formatMinimum("PIX")}` : "Confirmação em segundos",
      icon: <QrCode className="h-4 w-4" />,
      disabled: pixBelowMin,
    },
    {
      id: "CREDIT_CARD",
      label: "Cartão",
      hint: cardBelowMin
        ? `Mínimo ${formatMinimum("CREDIT_CARD")}`
        : savedCards.length > 0 && onSavedCardChange
          ? "1-click com cartão salvo"
          : "Adicionar cartão",
      icon: <CreditCard className="h-4 w-4" />,
      disabled: cardBelowMin,
    },
  ];

  const isDark = tone === "dark";
  return (
    <div className="space-y-2">
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
              <p
                className={`mt-0.5 text-[11px] leading-tight ${isDark ? "text-white/70" : "text-muted-foreground"}`}
              >
                {opt.hint}
              </p>
            </button>
          );
        })}
      </div>

      {value === "CREDIT_CARD" && onSavedCardChange && savedCards.length > 0 && (
        <div
          className={`space-y-1 rounded-xl border p-2 ${
            isDark ? "border-white/10 bg-white/5" : "border-border bg-secondary/40"
          }`}
        >
          {savedCards.map((c) => {
            const active = savedCardId === c.id;
            const rowBase = isDark
              ? active
                ? "bg-primary/25 text-white"
                : "text-white/80 hover:bg-white/10"
              : active
                ? "bg-primary/10 text-foreground"
                : "text-foreground hover:bg-accent";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSavedCardChange(c.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${rowBase}`}
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">
                    {(c.brand ?? "Cartão").toUpperCase()} •••• {c.last4}
                  </span>
                </span>
                {active && <Check className="h-4 w-4" />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              isDark ? "text-white/70 hover:bg-white/10" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Plus className="h-4 w-4" />
            Usar outro cartão
          </button>
        </div>
      )}

      {onSavedCardChange && (
        <Dialog
          open={addOpen}
          onOpenChange={(o) => {
            setAddOpen(o);
            // Se o usuário fechar sem adicionar cartão e não houver nenhum, voltar para PIX
            if (!o && savedCards.length === 0 && value === "CREDIT_CARD") {
              onChange("PIX");
            }
          }}
        >
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Adicionar cartão</DialogTitle>
              <DialogDescription>
                O cartão será usado nesta compra e ficará salvo para próximas com 1 clique
                (você pode desmarcar abaixo).
              </DialogDescription>
            </DialogHeader>
            <NewCardCheckoutStep
              amountCents={amountCents}
              submitLabel="Adicionar cartão"
              onSuccess={(newId) => {
                onSavedCardChange(newId);
                setAddOpen(false);
              }}
              onCancel={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
