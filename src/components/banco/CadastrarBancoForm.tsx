import { useState } from "react";
import {
  Building2,
  CreditCard,
  Diamond,
  Hash,
  Landmark,
  QrCode,
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
}

export function CadastrarBancoForm({ onClose }: CadastrarBancoFormProps) {
  const [banco, setBanco] = useState("");
  const [tipoConta, setTipoConta] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [tipoPix, setTipoPix] = useState("");
  const [chavePix, setChavePix] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Em breve você poderá cadastrar seus dados bancários");
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Banco */}
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

      {/* Tipo de conta */}
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

      {/* Agência */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Agência <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={agencia}
            onChange={(e) => setAgencia(e.target.value)}
            placeholder="Agência"
            className="pl-9 h-12 rounded-full"
            inputMode="numeric"
          />
        </div>
      </div>

      {/* Número da conta */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Número da conta (com dígito){" "}
          <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={conta}
            onChange={(e) => setConta(e.target.value)}
            placeholder="Número da conta (com dígito)"
            className="pl-9 h-12 rounded-full"
          />
        </div>
      </div>

      {/* Tipo de chave Pix */}
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

      {/* Chave Pix */}
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

      <div className="grid grid-cols-2 gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-full"
          onClick={onClose}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          className="h-12 rounded-full bg-gradient-primary text-primary-foreground"
        >
          Salvar
        </Button>
      </div>
    </form>
  );
}
