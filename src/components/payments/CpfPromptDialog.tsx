import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveBuyerCpf } from "@/lib/payments.functions";

function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function CpfPromptDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const save = useServerFn(saveBuyerCpf);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const digits = value.replace(/\D/g, "");
  const canSubmit = digits.length === 11 && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await save({ data: { cpf: digits } });
      toast.success("CPF salvo");
      setValue("");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível salvar o CPF");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Informe seu CPF</DialogTitle>
        <DialogDescription>
          O CPF é exigido pelo processador de pagamentos para gerar cobranças. Você só precisa informar uma vez.
        </DialogDescription>
        <div className="mt-4 space-y-3">
          <Input
            inputMode="numeric"
            autoFocus
            placeholder="000.000.000-00"
            value={value}
            onChange={(e) => setValue(maskCpf(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <Button className="w-full" disabled={!canSubmit} onClick={submit}>
            {saving ? "Salvando..." : "Salvar e continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
