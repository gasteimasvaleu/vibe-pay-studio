import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Diamond, Eye, EyeOff, Hash, QrCode, Wallet } from "lucide-react";
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
import { cn } from "@/lib/utils";

const PIX_PLACEHOLDERS: Record<string, string> = {
  cpf: "Digite seu CPF",
  cnpj: "Digite seu CNPJ",
  email: "Digite seu e-mail",
  telefone: "Digite seu telefone",
  aleatoria: "Digite a chave aleatória",
};

type Mode = "pix" | "asaas_split";

interface CadastrarBancoFormProps {
  onClose: () => void;
  kycVerified: boolean;
  walletId?: string;
  hasApiKey?: boolean;
  payoutMode?: Mode | null;
  initial?: { pixKeyType?: string; pixKey?: string } | null;
}

export function CadastrarBancoForm({
  onClose,
  kycVerified,
  walletId: initialWalletId = "",
  hasApiKey: initialHasApiKey = false,
  payoutMode,
  initial,
}: CadastrarBancoFormProps) {
  const [mode, setMode] = useState<Mode>(
    payoutMode ?? (initialWalletId ? "asaas_split" : "pix"),
  );
  const [walletId, setWalletId] = useState(initialWalletId);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
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
          payoutMode: mode,
          walletId: mode === "asaas_split" ? walletId : undefined,
          apiKey: mode === "asaas_split" ? apiKey || undefined : undefined,
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
        <div className="rounded-2xl border border-border bg-accent/40 p-4 text-sm text-foreground">
          <p className="font-semibold">Verificação de identidade pendente</p>
          <p className="mt-1 text-muted-foreground">
            Para receber pagamentos você precisa concluir a verificação de identidade.
          </p>
          <Link
            to="/creator/onboarding/documentos"
            className="mt-2 inline-block font-semibold underline"
          >
            Verificar agora
          </Link>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">Como você quer receber?</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === "pix"}
            onClick={() => setMode("pix")}
            title="Chave PIX"
            desc="Mais simples. Seu saldo fica no app e você saca para sua chave PIX."
          />
          <ModeCard
            active={mode === "asaas_split"}
            onClick={() => setMode("asaas_split")}
            title="Conta Asaas"
            desc="Sua parte cai direto na sua conta Asaas a cada venda."
          />
        </div>
      </section>

      {mode === "asaas_split" && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-foreground">Conta Asaas</h3>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Wallet ID Asaas <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="pl-9 h-12 rounded-md"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              É um código (não o e-mail). No painel Asaas: Minha Conta → Integrações → Wallet ID.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              API key Asaas
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Sua chave de API Asaas"
                className="pl-9 pr-10 h-12 rounded-md"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showApiKey ? "Ocultar API key" : "Mostrar API key"}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Necessária para sacar pelo app. Sem ela, faça o saque no painel Asaas.
            </p>
            {initialHasApiKey && !apiKey && (
              <p className="text-xs text-primary">
                API key já cadastrada. Deixe em branco para manter a atual.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-foreground">Chave PIX para saque</h3>
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
              <SelectTrigger className="pl-9 h-12 rounded-md">
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
              placeholder={tipoPix ? PIX_PLACEHOLDERS[tipoPix] : "Selecione o tipo de chave pix"}
              disabled={!tipoPix}
              className="pl-9 h-12 rounded-md"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A chave precisa estar no seu nome (mesmo CPF da verificação). Pode ser de qualquer banco.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <Button type="button" variant="outline" className="rounded-md" onClick={onClose} disabled={loading}>
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={loading || !kycVerified}
          className="rounded-md bg-gradient-primary text-primary-foreground"
        >
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40",
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
