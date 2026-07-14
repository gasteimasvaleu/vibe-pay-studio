import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CreditCard,
  Diamond,
  Eye,
  EyeOff,
  Hash,
  Landmark,
  QrCode,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveCreatorPayoutSetup } from "@/lib/payments.functions";

const BANCOS = [
  "Banco do Brasil",
  "Bradesco",
  "Caixa Econômica",
  "Itaú",
  "Nubank",
  "Santander",
  "Inter",
  "C6 Bank",
  "PicPay",
  "Mercado Pago",
];

const PIX_PLACEHOLDERS: Record<string, string> = {
  cpf: "Digite seu CPF",
  cnpj: "Digite seu CNPJ",
  email: "Digite seu e-mail",
  telefone: "Digite seu telefone",
  aleatoria: "Digite a chave aleatória",
};

interface CadastrarBancoFormProps {
  onClose: () => void;
  kycVerified: boolean;
  walletId?: string;
  hasApiKey?: boolean;
  initial?: {
    bankName?: string;
    accountType?: string;
    agency?: string;
    accountNumber?: string;
    pixKeyType?: string;
    pixKey?: string;
  } | null;
}

export function CadastrarBancoForm({
  onClose,
  kycVerified,
  walletId: initialWalletId = "",
  hasApiKey: initialHasApiKey = false,
  initial,
}: CadastrarBancoFormProps) {
  // Conta Asaas
  const [walletId, setWalletId] = useState(initialWalletId);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Banco / PIX
  const [banco, setBanco] = useState(initial?.bankName ?? "");
  const [tipoConta, setTipoConta] = useState(initial?.accountType ?? "");
  const [agencia, setAgencia] = useState(initial?.agency ?? "");
  const [conta, setConta] = useState(initial?.accountNumber ?? "");
  const [tipoPix, setTipoPix] = useState(initial?.pixKeyType ?? "");
  const [chavePix, setChavePix] = useState(initial?.pixKey ?? "");

  const [loading, setLoading] = useState(false);
  const savePayout = useServerFn(saveCreatorPayoutSetup);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycVerified) {
      toast.error("Verifique sua identidade antes de configurar o recebimento");
      return;
    }
    setLoading(true);
    try {
      await savePayout({
        data: {
          walletId,
          apiKey: apiKey || undefined,
          bankName: banco,
          accountType: tipoConta as "corrente" | "poupanca",
          agency: agencia,
          accountNumber: conta,
          pixKeyType: tipoPix as any,
          pixKey: chavePix,
        },
      });
      toast.success("Recebimento configurado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["payoutStatus"] });
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao configurar recebimento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!kycVerified && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Verificação de identidade pendente</p>
          <p className="mt-1">
            Para receber pagamentos você precisa concluir a verificação de
            identidade.
          </p>
          <Link
            to="/creator/onboarding/documentos"
            className="mt-2 inline-block font-semibold underline"
          >
            Verificar agora
          </Link>
        </div>
      )}

      {/* Conta Asaas */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-foreground">Conta Asaas</h3>

        <IconField
          icon={<Wallet className="h-4 w-4" />}
          label="Wallet ID Asaas"
          value={walletId}
          onChange={setWalletId}
          placeholder="00000000-0000-0000-0000-000000000000"
        />

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            API key Asaas (opcional)
          </Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Sua chave de API Asaas"
              className="pl-9 pr-10 h-12 rounded-full"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showApiKey ? "Ocultar API key" : "Mostrar API key"}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            A API key é necessária apenas se você quiser que o app faça saques
            Pix automaticamente. Você encontra em Minha Conta → Integrações/API
            no painel Asaas.
          </p>
          {initialHasApiKey && !apiKey && (
            <p className="text-xs text-emerald-600">
              API key já cadastrada. Deixe em branco para manter a atual.
            </p>
          )}
        </div>
      </section>

      {/* Conta bancária */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-foreground">Conta bancária</h3>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Banco <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Select value={banco} onValueChange={setBanco}>
              <SelectTrigger className="pl-9 h-12 rounded-full">
                <SelectValue placeholder="Banco" />
              </SelectTrigger>
              <SelectContent>
                {BANCOS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Tipo de conta <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Select value={tipoConta} onValueChange={setTipoConta}>
              <SelectTrigger className="pl-9 h-12 rounded-full">
                <SelectValue placeholder="Tipo de conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Conta corrente</SelectItem>
                <SelectItem value="poupanca">Conta poupança</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <IconField
          icon={<Building2 className="h-4 w-4" />}
          label="Agência"
          value={agencia}
          onChange={setAgencia}
          placeholder="Agência"
          inputMode="numeric"
        />

        <IconField
          icon={<Hash className="h-4 w-4" />}
          label="Número da conta (com dígito)"
          value={conta}
          onChange={setConta}
          placeholder="Número da conta (com dígito)"
        />

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Tipo de chave Pix <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Select
              value={tipoPix}
              onValueChange={(v) => {
                setTipoPix(v);
                setChavePix("");
              }}
            >
              <SelectTrigger className="pl-9 h-12 rounded-full">
                <SelectValue placeholder="Tipo de chave pix" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="aleatoria">Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Chave Pix <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Diamond className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder={
                tipoPix
                  ? PIX_PLACEHOLDERS[tipoPix]
                  : "Selecione o tipo de chave pix"
              }
              disabled={!tipoPix}
              className="pl-9 h-12 rounded-full"
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-full"
          onClick={onClose}
          disabled={loading}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={loading || !kycVerified}
          className="h-12 rounded-full bg-gradient-primary text-primary-foreground"
        >
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function IconField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type,
  inputMode,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label} <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {icon}
        </span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          inputMode={inputMode}
          className="pl-9 h-12 rounded-full"
        />
      </div>
    </div>
  );
}
