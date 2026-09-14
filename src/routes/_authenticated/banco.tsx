import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  Film,
  Gift,
  Info,
  MessageCircle,
  Pencil,
  Plus,
  Repeat,
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
import {
  getCreatorBancoOverview,
  hideTransactions,
  hideWithdrawals,
  listCreatorTransactions,
  listCreatorWithdrawals,
  unhideTransactions,
  unhideWithdrawals,
} from "@/lib/finance.functions";
import { cancelWithdrawal } from "@/lib/payouts.functions";
import { SacarDialog } from "@/components/banco/SacarDialog";
import {
  SelectionActionBar,
  SelectionCheckbox,
  SelectionHeader,
  useSelection,
} from "@/components/finance/SelectableList";
import { toast } from "sonner";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const formatBRL = (cents: number) => BRL.format((cents ?? 0) / 100);

const KIND_META: Record<
  string,
  { label: string; Icon: typeof Banknote }
> = {
  subscription: { label: "Assinatura", Icon: Repeat },
  tip: { label: "Gorjeta", Icon: Gift },
  publication_unlock: { label: "Desbloqueio de publicação", Icon: Wallet },
  chat_unlock: { label: "Desbloqueio no chat", Icon: MessageCircle },
  video_call: { label: "Chamada de vídeo", Icon: Film },
  withdrawal: { label: "Saque", Icon: Banknote },
  refund: { label: "Estorno", Icon: AlertCircle },
  wallet_topup: { label: "Recarga", Icon: Wallet },
  wallet_bonus: { label: "Bônus", Icon: Gift },
};
const kindMeta = (kind: string) =>
  KIND_META[kind] ?? { label: kind, Icon: Banknote };

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão",
  boleto: "Boleto",
  wallet: "Carteira",
  manual: "Manual",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const [sacarOrigin, setSacarOrigin] = useState<
    null | "Nacional" | "Internacional"
  >(null);
  const [isRefreshingAfterWithdrawal, setIsRefreshingAfterWithdrawal] =
    useState(false);
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getCreatorPayoutStatus);
  const fetchOverview = useServerFn(getCreatorBancoOverview);
  const fetchTransactions = useServerFn(listCreatorTransactions);
  const fetchWithdrawals = useServerFn(listCreatorWithdrawals);
  const runCancel = useServerFn(cancelWithdrawal);

  const statusQuery = useQuery({
    queryKey: ["payoutStatus"],
    queryFn: () => fetchStatus(),
  });
  const overviewQuery = useQuery({
    queryKey: ["bancoOverview"],
    queryFn: () => fetchOverview(),
  });
  const txQuery = useQuery({
    queryKey: ["bancoTransactions"],
    queryFn: () => fetchTransactions({ data: { limit: 20 } }),
  });
  const withdrawalsQuery = useQuery({
    queryKey: ["bancoWithdrawals"],
    queryFn: () => fetchWithdrawals(),
  });

  const status = statusQuery.data;
  const kycVerified = status?.kycStatus === "verified";
  const walletActive = !!status?.walletId;
  const hasApiKey = !!status?.hasApiKey;
  const payoutAccount = status?.payoutAccount ?? null;
  const pixKey: string | null = (payoutAccount as any)?.pix_key ?? null;
  const pixKeyType: string | null = (payoutAccount as any)?.pix_key_type ?? null;

  const overview = overviewQuery.data;
  const nationalReleased = overview?.national.releasedCents ?? 0;
  const nationalPending = overview?.national.pendingCents ?? 0;
  const intlReleased = overview?.international.releasedCents ?? 0;
  const intlPending = overview?.international.pendingCents ?? 0;
  const intlEmpty = intlReleased === 0 && intlPending === 0;

  const cancelMutation = useMutation({
    mutationFn: (id: string) => runCancel({ data: { withdrawalId: id } }),
    onSuccess: () => {
      toast.success("Saque cancelado");
      qc.invalidateQueries({ queryKey: ["bancoOverview"] });
      qc.invalidateQueries({ queryKey: ["bancoWithdrawals"] });
    },
    onError: (err: any) =>
      toast.error("Não foi possível cancelar", {
        description: String(err?.message ?? "erro desconhecido"),
      }),
  });

  async function refreshAfterWithdrawal(args: {
    amountCents: number;
    previousReleasedCents: number;
    origem: "Nacional" | "Internacional";
  }) {
    const bucket = args.origem === "Internacional" ? "international" : "national";
    const currentOverview = qc.getQueryData<any>(["bancoOverview"]) ?? overviewQuery.data;
    const previousBucketReleased = args.previousReleasedCents;
    const expectedBucketReleased = Math.max(previousBucketReleased - args.amountCents, 0);
    const previousTotalReleased = currentOverview?.totals?.releasedCents ?? previousBucketReleased;
    const expectedTotalReleased = Math.max(previousTotalReleased - args.amountCents, 0);

    const applyExpectedOverview = (base: any) => {
      if (!base) return base;
      return {
        ...base,
        [bucket]: {
          ...base[bucket],
          releasedCents: expectedBucketReleased,
        },
        totals: {
          ...base.totals,
          releasedCents: expectedTotalReleased,
        },
      };
    };

    setIsRefreshingAfterWithdrawal(true);
    await qc.cancelQueries({ queryKey: ["bancoOverview"] });
    qc.setQueryData(["bancoOverview"], applyExpectedOverview);
    try {
      let confirmedOverview: any = null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const freshOverview = await fetchOverview();

        if ((freshOverview?.totals.releasedCents ?? 0) <= expectedTotalReleased) {
          confirmedOverview = freshOverview;
          break;
        }

        qc.setQueryData(["bancoOverview"], applyExpectedOverview);

        await wait(1200);
      }

      qc.setQueryData(
        ["bancoOverview"],
        confirmedOverview ? confirmedOverview : applyExpectedOverview,
      );

      await Promise.all([
        qc.refetchQueries({ queryKey: ["bancoTransactions"], type: "active" }),
        qc.refetchQueries({ queryKey: ["bancoWithdrawals"], type: "active" }),
        qc.refetchQueries({ queryKey: ["payoutStatus"], type: "active" }),
      ]);
    } catch {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["bancoOverview"] }),
        qc.invalidateQueries({ queryKey: ["bancoTransactions"] }),
        qc.invalidateQueries({ queryKey: ["bancoWithdrawals"] }),
        qc.invalidateQueries({ queryKey: ["payoutStatus"] }),
      ]);
    } finally {
      setIsRefreshingAfterWithdrawal(false);
    }
  }

  function withdrawDisabledReason(released: number): string | null {
    if (!kycVerified) return "Conclua a verificação de identidade";
    if (!walletActive) return "Configure seu recebimento primeiro";
    if (!hasApiKey) return "Cadastre sua API Key Asaas para sacar";
    if (!pixKey) return "Cadastre uma chave PIX em Dados bancários";
    if (released < 5000) return "Saldo mínimo para saque: R$ 50,00";
    return null;
  }






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

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Cards de saldo */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              label: "Nacional",
              released: nationalReleased,
              pending: nationalPending,
              muted: false,
            },
            {
              label: "Internacional",
              released: intlReleased,
              pending: intlPending,
              muted: intlEmpty,
            },
          ].map((c) => {
            const disabledReason = withdrawDisabledReason(c.released);
            const canWithdraw = !disabledReason;
            return (
              <div
                key={c.label}
                className={`rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] ${
                  c.muted ? "opacity-70" : ""
                }`}
              >
                <p className="text-sm font-semibold text-muted-foreground">
                  {c.label}
                </p>
                <p className="mt-4 text-sm text-foreground">
                  Liberado para saque
                </p>
                {overviewQuery.isLoading ? (
                  <div className="mt-1 h-8 w-32 rounded bg-muted animate-pulse" />
                ) : (
                  <p className="text-xl font-semibold tracking-tight text-foreground">
                    {formatBRL(c.released)}
                  </p>
                )}
                <p className="mt-3 text-sm text-foreground">Saldo a liberar</p>
                {overviewQuery.isLoading ? (
                  <div className="mt-1 h-6 w-24 rounded bg-muted animate-pulse" />
                ) : (
                  <p className="text-lg font-semibold text-foreground">
                    {formatBRL(c.pending)}
                  </p>
                )}
                <Button
                  className="mt-4 w-full rounded-md"
                  disabled={!canWithdraw || isRefreshingAfterWithdrawal}
                  title={
                    isRefreshingAfterWithdrawal
                      ? "Atualizando saldo"
                      : disabledReason ?? "Solicitar saque via PIX"
                  }
                  onClick={() =>
                    setSacarOrigin(c.label as "Nacional" | "Internacional")
                  }
                >
                  Sacar
                </Button>

                {c.muted && !overviewQuery.isLoading && !isRefreshingAfterWithdrawal ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sem movimentações internacionais
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>

        {/* Extrato */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Extrato
          </h2>
          {txQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4 h-16 animate-pulse"
                />
              ))}
            </div>
          ) : (txQuery.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-border bg-accent/40 p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm text-foreground">
                Aqui você verá as movimentações da sua conta
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {(txQuery.data ?? []).map((t) => {
                const meta = kindMeta(t.kind as string);
                const Icon = meta.Icon;
                const created = t.created_at
                  ? dateFmt.format(new Date(t.created_at))
                  : "";
                const method = t.payment_method
                  ? PAYMENT_LABEL[t.payment_method] ?? t.payment_method
                  : null;
                const isPaid = t.status === "paid";
                return (
                  <li
                    key={t.id}
                    className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 shadow-[var(--shadow-card)]"
                  >
                    <div className="h-10 w-10 grid place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">
                          {meta.label}
                        </p>
                        {method ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide bg-accent text-muted-foreground rounded-full px-2 py-0.5">
                            {method}
                          </span>
                        ) : null}
                        {t.is_international ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                            Internacional
                          </span>
                        ) : null}
                        {!isPaid ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                            {t.status}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {created}
                        {t.net_cents != null
                          ? ` · Líquido ${formatBRL(t.net_cents)}`
                          : ""}
                      </p>
                    </div>
                    <p className="font-bold text-foreground text-sm shrink-0">
                      {formatBRL(t.amount_cents_gross ?? 0)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Saques */}
        {(withdrawalsQuery.data ?? []).length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Saques
            </h2>
            <ul className="space-y-2">
              {(withdrawalsQuery.data ?? []).map((w) => {
                const statusLabel =
                  w.status === "paid"
                    ? "Concluído"
                    : w.status === "requested"
                      ? "Solicitado"
                      : w.status === "rejected"
                        ? "Rejeitado"
                        : w.status === "failed"
                          ? "Falhou"
                          : (w.status as string);
                const statusColor =
                  w.status === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : w.status === "requested"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800";
                const when = w.requested_at
                  ? dateFmt.format(new Date(w.requested_at))
                  : "";
                return (
                  <li
                    key={w.id}
                    className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 shadow-[var(--shadow-card)]"
                  >
                    <div className="h-10 w-10 grid place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">
                          Saque PIX
                        </p>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {when}
                        {w.pix_key ? ` · ${w.pix_key}` : ""}
                      </p>
                      {w.rejection_reason ? (
                        <p className="text-xs text-red-700 mt-0.5">
                          {w.rejection_reason}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className="font-bold text-foreground text-sm">
                        {formatBRL(w.amount_cents ?? 0)}
                      </p>
                      {w.status === "requested" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Cancelar este saque e devolver o valor ao saldo liberado?",
                              )
                            ) {
                              cancelMutation.mutate(w.id);
                            }
                          }}
                          disabled={cancelMutation.isPending}
                          className="text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <SacarDialog
          open={!!sacarOrigin}
          onOpenChange={(o) => !o && setSacarOrigin(null)}
          origem={sacarOrigin ?? "Nacional"}
          saldoLiberadoCents={
            sacarOrigin === "Internacional" ? intlReleased : nationalReleased
          }
          pixKey={pixKey}
          pixKeyType={pixKeyType}
          onWithdrawalSuccess={refreshAfterWithdrawal}
        />




        {/* Integração com Asaas (explicativo) */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground">
                Integração com o Asaas
              </h2>
              <p className="text-sm text-muted-foreground">
                Usamos o Asaas como processador de pagamentos. Para receber, você
                precisa de uma conta lá — o repasse cai direto na sua carteira
                Asaas via split.
              </p>
              <a
                href="https://www.asaas.com/registrar"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Criar conta no Asaas
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="why">
              <AccordionTrigger className="text-sm font-semibold">
                Por que preciso de uma conta Asaas?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  O Asaas é o gateway que processa PIX e cartão dos seus fãs.
                  Toda venda é liquidada diretamente na sua carteira Asaas
                  através de um split automático — a plataforma retém apenas a
                  comissão e o restante é seu.
                </p>
                <p>
                  Sem uma conta Asaas cadastrada, não conseguimos enviar os
                  valores das vendas para você.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="wallet">
              <AccordionTrigger className="text-sm font-semibold">
                O que é o Wallet ID e como pegar?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  O Wallet ID é o identificador único da sua carteira Asaas
                  (formato UUID, ex.:{" "}
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    ced4e093-41f5-...
                  </code>
                  ). É para onde o split envia o valor de cada venda.
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Entre na sua conta em asaas.com</li>
                  <li>
                    Vá em <strong>Minha conta → Integrações</strong> (ou{" "}
                    <strong>Configurações → Wallet ID</strong>)
                  </li>
                  <li>Copie o identificador exibido</li>
                  <li>Cole no campo <strong>Wallet ID</strong> ao cadastrar seu banco aqui</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="apikey">
              <AccordionTrigger className="text-sm font-semibold">
                Como gerar minha API Key
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  A API Key permite que a plataforma consulte status de
                  cobranças e habilite saque automático na sua conta.
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Vá em{" "}
                    <strong>Minha conta → Integrações → Chaves de API</strong>
                  </li>
                  <li>
                    Clique em <strong>Gerar nova chave</strong> no ambiente{" "}
                    <strong>Produção</strong>
                  </li>
                  <li>
                    Copie o valor iniciado por{" "}
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      $aact_
                    </code>
                  </li>
                  <li>Cole no campo API Key ao cadastrar seu banco</li>
                </ol>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  ⚠ A chave é exibida apenas uma vez. Guarde em local seguro e
                  nunca compartilhe com terceiros.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fees">
              <AccordionTrigger className="text-sm font-semibold">
                Taxas cobradas
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-3">
                <div>
                  <p className="font-semibold text-foreground">
                    Comissão da plataforma
                  </p>
                  <p>
                    <strong>15%</strong> sobre cada transação (retida pela
                    Monetisexy).
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Taxas do Asaas (descontadas 100% do creator)
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <strong>PIX:</strong> R$ 1,99 por cobrança recebida
                    </li>
                    <li>
                      <strong>Cartão de crédito à vista:</strong> 2,99% + R$ 0,49
                      por transação
                    </li>
                    <li className="text-xs">
                      Boleto e cartão parcelado ainda não estão disponíveis no
                      checkout
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Valores mínimos por método
                  </p>
                  <p>
                    PIX <strong>R$ 3,00</strong> · Cartão <strong>R$ 2,00</strong>{" "}
                    — garantem sobra positiva ao creator após as taxas.
                  </p>
                </div>
                <div className="rounded-md bg-muted/60 p-3 text-xs">
                  <p className="font-semibold text-foreground mb-1">
                    Exemplo em um PIX de R$ 10,00:
                  </p>
                  <ul className="space-y-0.5">
                    <li>Plataforma (15%): R$ 1,50</li>
                    <li>Taxa Asaas (PIX): R$ 1,99</li>
                    <li className="font-semibold text-foreground">
                      Você recebe: R$ 6,51
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="prazo">
              <AccordionTrigger className="text-sm font-semibold">
                Prazo de recebimento
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>PIX:</strong> liquidação em poucos segundos após o
                  pagamento.
                </p>
                <p>
                  <strong>Cartão de crédito:</strong> ~32 dias após o pagamento
                  (regra padrão do Asaas).
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
                className="mt-3 rounded-md"
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
            <Button variant="default" className="mt-4 rounded-md" asChild>
              <Link to="/mywallet">Acessar carteira</Link>
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
              className="w-full rounded-md"
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

