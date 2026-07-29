import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { tokenizeAndSaveCard, deleteSavedCard } from "@/lib/saved-cards.functions";

type Phase = "idle" | "tokenizing" | "charging" | "done" | "error";

type Props = {
  /** Valor apenas informativo, mostrado no botão. */
  amountCents?: number;
  /** Chamado após tokenizar. Se retornar promise, aguardamos antes de fechar. */
  onSuccess: (savedCardId: string, keepCard: boolean) => void | Promise<void>;
  onCancel?: () => void;
  tone?: "light" | "dark";
  submitLabel?: string;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function NewCardCheckoutStep({
  amountCents,
  onSuccess,
  onCancel,
  tone = "light",
  submitLabel,
}: Props) {
  const qc = useQueryClient();
  const tokenize = useServerFn(tokenizeAndSaveCard);
  const removeCard = useServerFn(deleteSavedCard);

  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [validity, setValidity] = useState("");
  const [cvv, setCvv] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [keepCard, setKeepCard] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const busy = phase === "tokenizing" || phase === "charging" || phase === "done";
  const resetIfError = () => {
    if (phase === "error") setPhase("idle");
  };

  const formatNumber = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatCpf = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };
  const formatValidity = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (d.length < 3) return d;
    return `${d.slice(0, 2)}/${d.slice(2)}`;
  };
  const formatPostalCode = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  };
  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10)
      return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const digits = number.replace(/\D/g, "");
      const cpfDigits = cpf.replace(/\D/g, "");
      const cepDigits = postalCode.replace(/\D/g, "");
      const phoneDigits = phone.replace(/\D/g, "");
      const [mm, yy] = validity.split("/");
      if (
        digits.length < 13 ||
        !name.trim() ||
        cpfDigits.length !== 11 ||
        !/^\d{2}$/.test(mm ?? "") ||
        !/^\d{2}$/.test(yy ?? "") ||
        cvv.length < 3
      ) {
        throw new Error("Preencha todos os campos corretamente");
      }
      if (cepDigits.length !== 8) throw new Error("Informe um CEP válido (8 dígitos)");
      if (!addressNumber.trim()) throw new Error("Informe o número do endereço");
      if (phoneDigits.length < 10 || phoneDigits.length > 11)
        throw new Error("Informe um telefone válido com DDD");
      setPhase("tokenizing");
      const expYear = `20${yy}`;
      const tokenized = await tokenize({
        data: {
          number: digits,
          holderName: name.trim().toUpperCase(),
          expiryMonth: mm,
          expiryYear: expYear,
          ccv: cvv,
          cpf: cpfDigits,
          postalCode: cepDigits,
          addressNumber: addressNumber.trim(),
          phone: phoneDigits,
        },
      });
      qc.invalidateQueries({ queryKey: ["saved-cards"] });
      return tokenized;
    },
    onSuccess: async (res) => {
      try {
        setPhase("charging");
        await onSuccess(res.id, keepCard);
        setPhase("done");
        await new Promise((r) => setTimeout(r, 500));
      } finally {
        if (!keepCard) {
          try {
            await removeCard({ data: { id: res.id } });
            qc.invalidateQueries({ queryKey: ["saved-cards"] });
          } catch {
            /* ignore */
          }
        }
      }
    },
    onError: (e: any) => {
      setPhase("error");
      toast.error(e?.message ?? "Erro ao validar cartão");
    },
  });

  const isDark = tone === "dark";
  const inputClass = isDark
    ? "h-11 rounded-md bg-white/5 border border-white/15 text-white placeholder:text-white/50 focus-visible:ring-primary focus-visible:border-primary/60 px-4"
    : "h-11 rounded-md bg-muted border border-transparent hover:border-border focus-visible:border-primary/60 focus-visible:ring-primary px-4";
  const labelMuted = isDark ? "text-white/70" : "text-muted-foreground";
  const helperText = isDark ? "text-white/60" : "text-muted-foreground";
  const btnLabel =
    submitLabel ?? (amountCents ? `Pagar ${brl.format(amountCents / 100)}` : "Confirmar cartão");

  return (
    <div className="space-y-3">
      <p className={`flex items-center gap-1.5 text-xs ${helperText}`}>
        <ShieldCheck className="h-3.5 w-3.5" />
        Tokenização segura Asaas (PCI DSS). Nenhum dado sensível fica em nossos servidores.
      </p>

      <Input
        inputMode="numeric"
        placeholder="Número do cartão"
        value={number}
        onChange={(e) => setNumber(formatNumber(e.target.value))}
        className={inputClass}
      />
      <Input
        placeholder="Nome (como escrito no cartão)"
        value={name}
        onChange={(e) => setName(e.target.value.toUpperCase())}
        className={inputClass}
      />
      <Input
        inputMode="numeric"
        placeholder="CPF do titular"
        value={cpf}
        onChange={(e) => setCpf(formatCpf(e.target.value))}
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          inputMode="numeric"
          placeholder="Validade MM/AA"
          value={validity}
          onChange={(e) => setValidity(formatValidity(e.target.value))}
          className={inputClass}
        />
        <Input
          inputMode="numeric"
          placeholder="CVV"
          value={cvv}
          onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-[1fr_90px] gap-2">
        <Input
          inputMode="numeric"
          placeholder="CEP"
          value={postalCode}
          onChange={(e) => setPostalCode(formatPostalCode(e.target.value))}
          className={inputClass}
        />
        <Input
          inputMode="numeric"
          placeholder="Nº"
          value={addressNumber}
          onChange={(e) => setAddressNumber(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className={inputClass}
        />
      </div>
      <Input
        inputMode="tel"
        placeholder="Telefone com DDD"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        className={inputClass}
      />

      <label className={`flex items-center gap-2 text-sm ${labelMuted}`}>
        <input
          type="checkbox"
          checked={keepCard}
          onChange={(e) => setKeepCard(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Salvar cartão para próximas compras
      </label>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={mutation.isPending}
            className={isDark ? "text-white hover:bg-white/10" : ""}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="h-10 rounded-md bg-gradient-primary text-primary-foreground sm:min-w-[180px]"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Validando cartão…
            </>
          ) : (
            btnLabel
          )}
        </Button>
      </div>
    </div>
  );
}
