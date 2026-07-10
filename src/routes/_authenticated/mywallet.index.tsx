import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/mywallet/")({
  head: () => ({
    meta: [
      { title: "Carteira · Monetisex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyWalletPage,
});

function MyWalletPage() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [validity, setValidity] = useState("");
  const [cvv, setCvv] = useState("");

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

  const handleConfirm = () => {
    const digits = number.replace(/\D/g, "");
    const cpfDigits = cpf.replace(/\D/g, "");
    if (
      digits.length !== 16 ||
      !name.trim() ||
      cpfDigits.length !== 11 ||
      !/^\d{2}\/\d{2}$/.test(validity) ||
      cvv.length < 3
    ) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    toast.success("Cartão adicionado");
    setOpen(false);
    setNumber("");
    setName("");
    setCpf("");
    setValidity("");
    setCvv("");
  };



  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{ background: "var(--gradient-radial)" }}
      />

      <header className="relative z-10 border-b border-border backdrop-blur-md bg-card/80">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Carteira
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <section>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <Link
                to="/mywallet/extrato"
                className="block -m-2 p-2 rounded-lg hover:bg-accent/40 transition-colors"
              >
                <p className="text-sm text-muted-foreground">Saldo na carteira</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                  R$ -
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Recarregue a sua carteira e compre conteúdos de forma simples e
                  fácil
                </p>
              </Link>
              <Button
                asChild
                className="mt-4 h-11 px-6 rounded-full bg-gradient-primary text-primary-foreground"
              >
                <Link to="/mywallet/recarregar">Recarregar</Link>
              </Button>
            </div>
            <Link
              to="/mywallet/extrato"
              aria-label="Ver extrato"
              className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Meus Cartões
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={soon}
              className="group aspect-square rounded-2xl border border-dashed border-border bg-card p-4 flex flex-col justify-between text-left hover:border-primary/60 hover:bg-accent transition-colors"
            >
              <Plus className="h-6 w-6 text-primary" />
              <span className="text-sm font-semibold text-foreground leading-tight">
                Adicionar
                <br />
                novo cartão
              </span>
            </button>
          </div>
        </section>

        <hr className="border-border" />

        <section className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Últimas Transações
          </h2>
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhuma transação encontrada
          </p>
          <Button
            asChild
            variant="outline"
            className="rounded-full text-primary border-primary hover:text-primary hover:bg-primary/10"
          >
            <Link to="/mywallet/extrato">Ver todas as transações</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}