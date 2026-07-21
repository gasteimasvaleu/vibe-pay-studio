import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { listSubscriberTransactions } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/mywallet/extrato")({
  head: () => ({
    meta: [
      { title: "Transações · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExtratoPage,
});

const TIPO_ITEM_OPTIONS = [
  "Todos",
  "Assinatura",
  "Chat",
  "Desafio",
  "Live",
  "Mimo",
  "Postagem",
  "Recarga Wallet",
  "Videochamada",
];
const TIPO_PAGAMENTO_OPTIONS = [
  "Todos",
  "ApplePay",
  "Cartão",
  "GooglePay",
  "PicPayWallet",
  "Pix",
];
const STATUS_OPTIONS = ["Todos", "Negado", "Autorizado", "Devolvido"];

const KIND_TO_ENUM: Record<string, string[]> = {
  Assinatura: ["subscription"],
  Chat: ["chat_unlock"],
  Mimo: ["tip"],
  Postagem: ["publication_unlock"],
  "Recarga Wallet": ["wallet_topup", "wallet_bonus"],
  Videochamada: ["video_call"],
  Desafio: ["__none__"],
  Live: ["__none__"],
};
const PAYMENT_TO_ENUM: Record<string, string[]> = {
  Cartão: ["credit_card"],
  Pix: ["pix"],
  PicPayWallet: ["wallet"],
  ApplePay: ["__none__"],
  GooglePay: ["__none__"],
};
const STATUS_TO_ENUM: Record<string, string[]> = {
  Autorizado: ["paid"],
  Devolvido: ["refunded"],
  Negado: ["failed", "cancelled"],
};

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
const PAYMENT_LABEL: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão",
  wallet: "Carteira",
  boleto: "Boleto",
  manual: "Manual",
};
const STATUS_LABEL: Record<string, string> = {
  paid: "Autorizado",
  pending: "Pendente",
  failed: "Negado",
  cancelled: "Cancelado",
  refunded: "Devolvido",
};
const STATUS_CLASS: Record<string, string> = {
  paid: "text-emerald-600",
  pending: "text-amber-600",
  failed: "text-red-600",
  cancelled: "text-red-600",
  refunded: "text-muted-foreground",
};
const CREDIT_KINDS = new Set(["wallet_topup", "wallet_bonus", "refund"]);

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function ExtratoPage() {
  const router = useRouter();
  const [tipoItem, setTipoItem] = useState<string | null>(null);
  const [tipoPagamento, setTipoPagamento] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [itemOpen, setItemOpen] = useState(false);
  const [pagOpen, setPagOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const listTx = useServerFn(listSubscriberTransactions);

  const filters = useMemo(() => {
    const from = range?.from ? new Date(range.from) : null;
    if (from) from.setHours(0, 0, 0, 0);
    const to = range?.to ? new Date(range.to) : null;
    if (to) to.setHours(23, 59, 59, 999);
    return {
      kinds: tipoItem ? KIND_TO_ENUM[tipoItem] ?? [] : [],
      paymentMethods: tipoPagamento ? PAYMENT_TO_ENUM[tipoPagamento] ?? [] : [],
      statuses: status ? STATUS_TO_ENUM[status] ?? [] : [],
      from: from ? from.toISOString() : undefined,
      to: to ? to.toISOString() : undefined,
      limit: 100,
    };
  }, [tipoItem, tipoPagamento, status, range]);

  const txQ = useQuery({
    queryKey: ["subscriber-transactions", filters],
    queryFn: () => listTx({ data: filters }),
  });

  const transactions = txQ.data ?? [];

  const renderOptions = (
    opts: string[],
    current: string | null,
    onPick: (v: string | null) => void,
  ) => (
    <div className="flex flex-wrap gap-2">
      {opts.map((opt) => {
        const active = current === opt || (opt === "Todos" && !current);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt === "Todos" ? null : opt)}
            className={cn(
              "h-9 px-4 rounded-md text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Transações
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Popover open={itemOpen} onOpenChange={setItemOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-12 rounded-md justify-between px-5 font-normal bg-secondary hover:bg-secondary/80 border-0",
                  !tipoItem && "text-muted-foreground",
                )}
              >
                {tipoItem ?? "Tipo de item"}
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
              {renderOptions(TIPO_ITEM_OPTIONS, tipoItem, (v) => {
                setTipoItem(v);
                setItemOpen(false);
              })}
            </PopoverContent>
          </Popover>

          <Popover open={pagOpen} onOpenChange={setPagOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-12 rounded-md justify-between px-5 font-normal bg-secondary hover:bg-secondary/80 border-0",
                  !tipoPagamento && "text-muted-foreground",
                )}
              >
                {tipoPagamento ?? "Tipo de pagamento"}
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
              {renderOptions(TIPO_PAGAMENTO_OPTIONS, tipoPagamento, (v) => {
                setTipoPagamento(v);
                setPagOpen(false);
              })}
            </PopoverContent>
          </Popover>

          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-12 rounded-md justify-between px-5 font-normal bg-secondary hover:bg-secondary/80 border-0",
                  !status && "text-muted-foreground",
                )}
              >
                {status ?? "Status"}
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
              {renderOptions(STATUS_OPTIONS, status, (v) => {
                setStatus(v);
                setStatusOpen(false);
              })}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="rounded-md px-5 font-normal justify-start gap-3 bg-secondary hover:bg-secondary/80 border-0"
              >
                <CalendarIcon className="h-4 w-4 opacity-70 shrink-0" />
                <span className={cn(!range?.from && "text-muted-foreground")}>
                  {range?.from
                    ? format(range.from, "dd/MM/yyyy")
                    : "Data inicial"}
                </span>
                <span className="text-muted-foreground">Até</span>
                <span className={cn(!range?.to && "text-muted-foreground")}>
                  {range?.to ? format(range.to, "dd/MM/yyyy") : "Data final"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {txQ.isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-16">
            Carregando…
          </p>
        ) : transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">
            Nenhuma transação encontrada
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {transactions.map((tx) => {
              const isCredit = CREDIT_KINDS.has(tx.kind);
              return (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {KIND_LABEL[tx.kind] ?? tx.kind}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                      {tx.payment_method
                        ? ` · ${PAYMENT_LABEL[tx.payment_method] ?? tx.payment_method}`
                        : ""}
                      {" · "}
                      <span
                        className={cn(
                          "font-semibold",
                          STATUS_CLASS[tx.status] ?? "text-muted-foreground",
                        )}
                      >
                        {STATUS_LABEL[tx.status] ?? tx.status}
                      </span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums shrink-0",
                      isCredit ? "text-emerald-600" : "text-foreground",
                    )}
                  >
                    {isCredit ? "+" : "−"}{" "}
                    {currency.format(tx.amount_cents_gross / 100)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
