import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PRESETS = [500, 2000, 5000, 10000];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCents: number | null;
  onConfirm: (cents: number | null) => void;
  title?: string;
  description?: React.ReactNode;
  allowZero?: boolean;
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PriceDialog({
  open,
  onOpenChange,
  initialCents,
  onConfirm,
  title = "Definir valor da mensagem",
  description = "Cobre pelo conteúdo da próxima mensagem. O assinante só verá o texto após pagar via PIX.",
  allowZero = false,
}: Props) {
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    if (open) {
      setValue(initialCents ? (initialCents / 100).toFixed(2) : "");
    }
  }, [open, initialCents]);

  const parsed = Math.round(parseFloat(value.replace(",", ".")) * 100);
  const cents = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const valid = allowZero
    ? cents === 0 || (cents >= 100 && cents <= 50000)
    : cents >= 100 && cents <= 50000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setValue((p / 100).toFixed(2))}
                className={cn(
                  "h-10 rounded-lg border text-sm font-medium transition-colors",
                  cents === p
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent",
                )}
              >
                {formatBRL(p)}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Valor personalizado (R$)</label>
            <Input
              type="number"
              min={allowZero ? "0" : "1"}
              max="500"
              step="0.01"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex.: 25,00"
            />
            <p className="text-[11px] text-muted-foreground">
              {allowZero ? "Opcional · " : ""}Mínimo R$ 1,00 · máximo R$ 500,00
            </p>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onConfirm(null);
              onOpenChange(false);
            }}
          >
            Remover preço
          </Button>
          <Button
            type="button"
            disabled={!valid}
            className="bg-gradient-primary text-primary-foreground"
            onClick={() => {
              onConfirm(cents);
              onOpenChange(false);
            }}
          >
            {allowZero && cents === 0
              ? "Definir gratuito"
              : `Definir ${valid ? formatBRL(cents) : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
