import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Pencil,
  Plus,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CadastrarBancoForm } from "@/components/banco/CadastrarBancoForm";
import { getCreatorPayoutStatus } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/banco")({
  head: () => ({
    meta: [
      { title: "Meu Banco · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BancoPage,
});

function BancoPage() {
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const fetchStatus = useServerFn(getCreatorPayoutStatus);
  const statusQuery = useQuery({
    queryKey: ["payoutStatus"],
    queryFn: () => fetchStatus(),
  });
  const status = statusQuery.data;
  const kycVerified = status?.kycStatus === "verified";
  const walletActive = !!status?.walletId;
  const payoutAccount = status?.payoutAccount ?? null;


  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-white" />

      <header className="relative z-10 border-b border-border bg-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Meu Banco
          </h1>
          <button
            onClick={() => setInfoOpen(true)}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Como funcionam os saques"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Cards de saldo */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Nacional" },
            { label: "Internacional" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <p className="text-sm font-semibold text-muted-foreground">
                {c.label}
              </p>
              <p className="mt-4 text-sm text-foreground">Liberado para saque</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">
                R$ -
              </p>
              <p className="mt-3 text-sm text-foreground">Saldo a liberar</p>
              <p className="text-lg font-semibold text-foreground">R$ -</p>
              <Button className="mt-4 w-full rounded-full" disabled>
                Sacar
              </Button>
            </div>
          ))}
        </section>

        {/* Extrato */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Extrato
          </h2>
          <div className="rounded-2xl border border-border bg-accent/40 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-foreground">
              Aqui você verá as movimentações da sua conta
            </p>
          </div>
        </section>

        {/* Status recebimento */}
        {statusQuery.isLoading ? null : !kycVerified ? (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                Verifique sua identidade
              </p>
              <p className="text-sm text-amber-900/80">
                Você precisa concluir a verificação para configurar o
                recebimento.
              </p>
              <Link
                to="/creator/onboarding/documentos"
                className="mt-2 inline-block text-sm font-semibold text-amber-900 underline"
              >
                Verificar agora
              </Link>
            </div>
          </section>
        ) : !walletActive ? (
          <section className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                Configure seu recebimento
              </p>
              <p className="text-sm text-muted-foreground">
                Cadastre seus dados para começar a receber pelos conteúdos
                vendidos.
              </p>
              <Button
                type="button"
                onClick={() => setCadastroOpen(true)}
                className="mt-3 rounded-full"
              >
                Configurar recebimento
              </Button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 space-y-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-900 font-medium">
                Recebimento ativo
                {status?.accountStatus ? ` · ${status.accountStatus}` : ""}
              </p>
            </div>
            <p className="text-xs text-emerald-900/80 break-all">
              Wallet ID: {status?.walletId}
            </p>
            <p className="text-xs text-emerald-900/80">
              Saque automático: {status?.hasApiKey ? "ativado" : "não ativado"}
            </p>
          </section>
        )}

        {/* Dados bancários */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Dados bancários
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {payoutAccount ? (
              <button
                type="button"
                onClick={() => setCadastroOpen(true)}
                className="aspect-square rounded-2xl border border-border bg-card p-4 flex flex-col justify-between text-left hover:border-primary/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <Wallet className="h-5 w-5 text-primary" />
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {payoutAccount.bank_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Ag {payoutAccount.agency} · CC {payoutAccount.account_number}
                  </p>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCadastroOpen(true)}
                className="group aspect-square rounded-2xl border border-dashed border-border bg-card p-4 flex flex-col justify-between text-left hover:border-primary/60 hover:bg-accent transition-colors"
              >
                <Plus className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold text-foreground leading-tight">
                  Adicionar
                  <br />
                  novo banco
                </span>
              </button>
            )}
          </div>
        </section>


        {/* Minha carteira */}
        <section>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-foreground" />
              <h3 className="text-base font-semibold text-foreground">
                Minha carteira
              </h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Veja seu saldo, gerencie suas formas de pagamento e acompanhe suas
              transações
            </p>
            <Button variant="outline" className="mt-4 rounded-full">
              Acessar carteira
            </Button>
          </div>
        </section>
      </main>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-left">
              Entenda como funciona os saques na Monetisexy
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 grid place-items-center">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Disponível para saque
                </p>
                <p className="text-sm text-muted-foreground">
                  O saldo disponível corresponde ao valor que você pode sacar
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 grid place-items-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Saldo pendente</p>
                <p className="text-sm text-muted-foreground">
                  O saldo pendente corresponde ao valor que ainda não foi
                  liberado
                </p>
              </div>
            </div>

            <hr className="border-border" />

            <div className="space-y-2">
              <p className="font-semibold text-foreground">
                Processo de liberação do saldo
              </p>
              <p className="text-sm text-muted-foreground">
                Descubra quando seu saldo estará disponível para saque
              </p>
              <p className="text-sm text-foreground pt-2">
                <span className="font-semibold">Cartão de crédito:</span> 14 dias
              </p>
              <p className="text-sm font-semibold text-foreground pt-2">
                Outros métodos de pagamento
              </p>
              <ul className="text-sm text-foreground space-y-1">
                <li>→ Live: <span className="font-semibold">3 dias</span></li>
                <li>
                  → Internacional:{" "}
                  <span className="font-semibold">14 dias</span>
                </li>
                <li>
                  → Nacional:{" "}
                  <span className="font-semibold text-emerald-600">
                    Instantâneo
                  </span>
                </li>
              </ul>
            </div>

            <Button
              className="w-full rounded-full"
              variant="outline"
              onClick={() => setInfoOpen(false)}
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={cadastroOpen} onOpenChange={setCadastroOpen}>
        <SheetContent
          side="bottom"
          className="h-[90vh] rounded-t-2xl overflow-y-auto p-0"
        >
          <SheetHeader className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-md px-4 md:px-6 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCadastroOpen(false)}
                className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <SheetTitle className="text-base font-semibold text-foreground truncate">
                Cadastrar Dados Bancários
              </SheetTitle>
              <span className="w-9" />
            </div>
          </SheetHeader>
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
            <CadastrarBancoForm
              onClose={() => setCadastroOpen(false)}
              kycVerified={kycVerified}
              walletId={status?.walletId ?? ""}
              hasApiKey={status?.hasApiKey ?? false}
              initial={payoutAccount ? mapPayout(payoutAccount) : null}
            />

          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function mapPayout(p: any) {
  return {
    bankName: p.bank_name,
    accountType: p.account_type,
    agency: p.agency,
    accountNumber: p.account_number,
    pixKeyType: p.pix_key_type,
    pixKey: p.pix_key,
  };
}

