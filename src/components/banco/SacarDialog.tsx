import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestWithdrawal } from "@/lib/payouts.functions";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const formatBRL = (cents: number) => BRL.format((cents ?? 0) / 100);

const MIN_CENTS = 5000; // R$ 50,00 (mín. do server)

export const PIX_TYPE_LABEL: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave aleatória",
};

export function maskPix(key: string, type?: string | null) {
  if (!key) return "";
  if (type === "cpf" || type === "cnpj") {
    return key.replace(/^(\d{3})(\d+)(\d{2})$/, "$1.***.***-$3");
  }
  if (type === "email") {
    const [u, d] = key.split("@");
    if (!d) return key;
    return `${u.slice(0, 2)}***@${d}`;
  }
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  origem: "Nacional" | "Internacional";
  saldoLiberadoCents: number;
  pixKey: string | null;
  pixKeyType: string | null;
  payoutMode?: "pix" | "asaas_split" | null;
  onWithdrawalSuccess?: (args: {
    amountCents: number;
    previousReleasedCents: number;
    origem: "Nacional" | "Internacional";
  }) => Promise<void> | void;
}

export function SacarDialog({
  open,
  onOpenChange,
  origem,
  saldoLiberadoCents,
  pixKey,
  pixKeyType,
  payoutMode,
  onWithdrawalSuccess,
}: Props) {
  const qc = useQueryClient();
  const run = useServerFn(requestWithdrawal);
  const [valorStr, setValorStr] = useState<string>(() =>
    (saldoLiberadoCents / 100).toFixed(2).replace(".", ","),
  );

  const amountCents = useMemo(() => {
    const n = Number(valorStr.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  }, [valorStr]);

  useEffect(() => {
    if (!open) return;
    setValorStr((saldoLiberadoCents / 100).toFixed(2).replace(".", ","));
  }, [open, saldoLiberadoCents]);

  const error = useMemo(() => {
    if (!pixKey) return "Cadastre uma chave PIX em Dados bancários.";
    if (amountCents <= 0) return "Informe um valor.";
    if (amountCents < MIN_CENTS)
      return `Valor mínimo para saque: ${formatBRL(MIN_CENTS)}.`;
    if (amountCents > saldoLiberadoCents)
      return `Saldo liberado insuficiente (máx. ${formatBRL(saldoLiberadoCents)}).`;
    return null;
  }, [amountCents, saldoLiberadoCents, pixKey]);

  const mutation = useMutation({
    mutationFn: () =>
      run({
        data: {
          amountCents,
          pixKey: pixKey!,
          pixKeyType: pixKeyType ?? undefined,
        },
      }),
    onSuccess: async (res: any) => {
      const withdrawnAmountCents = amountCents;
      const previousReleasedCents = saldoLiberadoCents;
      const isDone = res?.status === "paid";
      const failed = res?.status === "rejected" || res?.status === "failed";
      const statusMsg = isDone
        ? "Saque concluído"
        : failed
          ? "Saque não pôde ser concluído"
          : "Saque solicitado";
      const description = isDone
        ? `${formatBRL(amountCents)} enviado via PIX.`
        : failed
          ? `Não foi possível enviar ${formatBRL(amountCents)} via PIX.`
          : `${formatBRL(amountCents)} solicitado. A transferência PIX está aguardando autorização e será enviada em breve — o status é atualizado automaticamente na lista de saques.`;
      toast.success(statusMsg, { description });
      onOpenChange(false);
      await onWithdrawalSuccess?.({
        amountCents: withdrawnAmountCents,
        previousReleasedCents,
        origem,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["bancoTransactions"] }),
        qc.invalidateQueries({ queryKey: ["bancoWithdrawals"] }),
        qc.invalidateQueries({ queryKey: ["payoutStatus"] }),
      ]);
    },
    onError: (err: any) => {
      toast.error("Não foi possível sacar", {
        description: String(err?.message ?? "erro desconhecido"),
      });
    },
  });

  const disabled = !!error || mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sacar saldo · {origem}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-accent/40 p-3 text-sm">
            <p className="text-muted-foreground">Saldo liberado</p>
            <p className="text-lg font-bold text-foreground">
              {formatBRL(saldoLiberadoCents)}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="valor">Valor a sacar (R$)</Label>
            <Input
              id="valor"
              inputMode="decimal"
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo {formatBRL(MIN_CENTS)}.{" "}
              {payoutMode === "pix"
                ? "O envio é feito pela plataforma até a sua chave PIX."
                : "Transferência via PIX pela Asaas."}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chave PIX de destino
            </p>
            {pixKey ? (
              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground">
                  {maskPix(pixKey, pixKeyType)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pixKeyType
                    ? PIX_TYPE_LABEL[pixKeyType] ?? pixKeyType
                    : "PIX"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-destructive">
                Nenhuma chave PIX cadastrada.
              </p>
            )}
            <Link
              to="/banco/cadastrar"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Alterar dados bancários
            </Link>
          </div>

          {origem === "Internacional" ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Saques internacionais ainda são processados via PIX na chave
              cadastrada acima.
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={disabled}
            className="rounded-md"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando…
              </>
            ) : (
              "Confirmar saque"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
