import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, CreditCard, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getSubscriberWallet,
  listSubscriberTransactions,
} from "@/lib/finance.functions";
import {
  chargeSavedCardTopUp,
  deleteSavedCard,
  listSavedCards,
  tokenizeAndSaveCard,
  type SavedCardDTO,
} from "@/lib/saved-cards.functions";

export const Route = createFileRoute("/_authenticated/mywallet/")({
  head: () => ({
    meta: [
      { title: "Carteira · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyWalletPage,
});

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const KIND_LABEL: Record<string, string> = {
  wallet_topup: "Recarga da carteira",
  wallet_bonus: "Bônus na carteira",
  publication_unlock: "Desbloqueio de publicação",
  chat_unlock: "Desbloqueio de mensagem",
  subscription: "Assinatura",
  tip: "Gorjeta enviada",
  video_call: "Videochamada",
  withdrawal: "Saque",
  refund: "Estorno",
};

const CREDIT_KINDS = new Set(["wallet_topup", "wallet_bonus", "refund"]);

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return "";
  }
}

function MyWalletPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const getWallet = useServerFn(getSubscriberWallet);
  const listTx = useServerFn(listSubscriberTransactions);
  const listCards = useServerFn(listSavedCards);
  const tokenize = useServerFn(tokenizeAndSaveCard);
  const removeCard = useServerFn(deleteSavedCard);
  const chargeCard = useServerFn(chargeSavedCardTopUp);

  const walletQ = useQuery({
    queryKey: ["subscriber-wallet"],
    queryFn: () => getWallet(),
  });

  const txQ = useQuery({
    queryKey: ["subscriber-transactions"],
    queryFn: () => listTx({ data: { limit: 10 } }),
  });

  const cardsQ = useQuery({
    queryKey: ["saved-cards"],
    queryFn: () => listCards(),
  });

  // --- Add card dialog ---
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

  const resetCardForm = () => {
    setNumber("");
    setName("");
    setCpf("");
    setValidity("");
    setCvv("");
  };

  const addCardMut = useMutation({
    mutationFn: async () => {
      const digits = number.replace(/\D/g, "");
      const cpfDigits = cpf.replace(/\D/g, "");
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
      const expYear = `20${yy}`;
      return tokenize({
        data: {
          number: digits,
          holderName: name.trim().toUpperCase(),
          expiryMonth: mm,
          expiryYear: expYear,
          ccv: cvv,
          cpf: cpfDigits,
          postalCode: "00000000",
          addressNumber: "0",
        },
      });
    },
    onSuccess: () => {
      toast.success("Cartão adicionado");
      setOpen(false);
      resetCardForm();
      qc.invalidateQueries({ queryKey: ["saved-cards"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar cartão"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeCard({ data: { id } }),
    onSuccess: () => {
      toast.success("Cartão removido");
      qc.invalidateQueries({ queryKey: ["saved-cards"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover cartão"),
  });

  // --- Quick recharge via saved card ---
  const [rechargeCard, setRechargeCard] = useState<SavedCardDTO | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState(50);

  const rechargeMut = useMutation({
    mutationFn: (args: { savedCardId: string; amountCents: number }) =>
      chargeCard({ data: args }),
    onSuccess: (res) => {
      if (["RECEIVED", "CONFIRMED"].includes(res.status)) {
        toast.success("Recarga confirmada!");
      } else {
        toast.success("Cobrança criada. Aguardando confirmação.");
      }
      setRechargeCard(null);
      qc.invalidateQueries({ queryKey: ["subscriber-wallet"] });
      qc.invalidateQueries({ queryKey: ["subscriber-transactions"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao recarregar"),
  });

  const balanceCents = walletQ.data?.balanceCents ?? 0;
  const transactions = txQ.data ?? [];
  const savedCards = cardsQ.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
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
                  {walletQ.isLoading
                    ? "R$ …"
                    : currency.format(balanceCents / 100)}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Recarregue a sua carteira e compre conteúdos de forma simples e
                  fácil
                </p>
              </Link>
              <Button
                asChild
                className="mt-4 px-6 rounded-md bg-gradient-primary text-primary-foreground"
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
          <p className="text-sm text-muted-foreground">
            Cartões salvos aqui são usados para recarregar sua carteira com 1 clique.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {savedCards.map((c) => (
              <div
                key={c.id}
                className="group relative aspect-square rounded-2xl border border-border bg-card p-4 flex flex-col justify-between text-left hover:border-primary/60 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <CreditCard className="h-6 w-6 text-primary" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Remover este cartão?")) deleteMut.mutate(c.id);
                    }}
                    aria-label="Remover cartão"
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 grid place-items-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    {c.brand ?? "Cartão"}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    •••• {c.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.expMonth}/{c.expYear.slice(-2)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRechargeAmount(50);
                      setRechargeCard(c);
                    }}
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                  >
                    Recarregar
                  </button>
                </div>
              </div>
            ))}

            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) resetCardForm();
              }}
            >
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="group aspect-square rounded-2xl border border-dashed border-border bg-card p-4 flex flex-col justify-between text-left hover:border-primary/60 hover:bg-accent transition-colors"
                >
                  <Plus className="h-6 w-6 text-primary" />
                  <span className="text-sm font-semibold text-foreground leading-tight">
                    Adicionar
                    <br />
                    novo cartão
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Adicionar cartão</DialogTitle>
                  <DialogDescription>
                    Seu cartão é tokenizado com segurança pelo Asaas (padrão PCI DSS).
                    Nenhum dado sensível é armazenado por nós.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input
                    inputMode="numeric"
                    placeholder="NÚMERO DO CARTÃO"
                    value={number}
                    onChange={(e) => setNumber(formatNumber(e.target.value))}
                    className="h-12 rounded-md bg-muted border-0 px-5"
                  />
                  <Input
                    placeholder="NOME (COMO ESCRITO NO CARTÃO)"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="h-12 rounded-md bg-muted border-0 px-5"
                  />
                  <Input
                    inputMode="numeric"
                    placeholder="CPF DO TITULAR"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    className="h-12 rounded-md bg-muted border-0 px-5"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      inputMode="numeric"
                      placeholder="VALIDADE MM/AA"
                      value={validity}
                      onChange={(e) => setValidity(formatValidity(e.target.value))}
                      className="h-12 rounded-md bg-muted border-0 px-5"
                    />
                    <Input
                      inputMode="numeric"
                      placeholder="CVV"
                      value={cvv}
                      onChange={(e) =>
                        setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      className="h-12 rounded-md bg-muted border-0 px-5"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => addCardMut.mutate()}
                      disabled={addCardMut.isPending}
                      className="h-9 px-8 rounded-md bg-gradient-primary text-primary-foreground"
                    >
                      {addCardMut.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando…
                        </>
                      ) : (
                        "Confirmar"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Quick recharge dialog */}
        <Dialog
          open={!!rechargeCard}
          onOpenChange={(o) => {
            if (!o) setRechargeCard(null);
          }}
        >
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Recarga com 1 clique</DialogTitle>
              <DialogDescription>
                Cobrar {rechargeCard?.brand ?? "cartão"} •••• {rechargeCard?.last4}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <label className="text-sm text-muted-foreground">
                Valor da recarga (R$)
              </label>
              <Input
                type="number"
                min={10}
                step={10}
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(Number(e.target.value) || 0)}
                className="h-12 rounded-md bg-muted border-0 px-5"
              />
              <p className="text-xs text-muted-foreground">Valor mínimo R$ 10,00.</p>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setRechargeCard(null)}
                disabled={rechargeMut.isPending}
                className="rounded-md"
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  rechargeCard &&
                  rechargeMut.mutate({
                    savedCardId: rechargeCard.id,
                    amountCents: Math.round(rechargeAmount * 100),
                  })
                }
                disabled={rechargeMut.isPending || rechargeAmount < 10}
                className="rounded-md bg-gradient-primary text-primary-foreground"
              >
                {rechargeMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cobrando…
                  </>
                ) : (
                  `Cobrar ${currency.format(rechargeAmount || 0)}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <hr className="border-border" />

        <section className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Últimas Transações
          </h2>

          {txQ.isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Carregando…
            </p>
          ) : transactions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma transação encontrada
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {transactions.map((tx) => {
                const isCredit = CREDIT_KINDS.has(tx.kind);
                const amount = currency.format(tx.amount_cents_gross / 100);
                return (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {KIND_LABEL[tx.kind] ?? tx.kind}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.created_at)}
                        {tx.status !== "paid" ? ` · ${tx.status}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        isCredit ? "text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {isCredit ? "+" : "−"} {amount}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <Button
            asChild
            variant="outline"
            className="rounded-md text-primary border-primary hover:text-primary hover:bg-primary/10"
          >
            <Link to="/mywallet/extrato">Ver todas as transações</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
