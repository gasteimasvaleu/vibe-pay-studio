import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listAdminTransactions } from "@/lib/admin-dashboard.functions";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: AdminTransactions,
});

const KIND_OPTS = [
  { v: "", l: "Todos os tipos" },
  { v: "publication_unlock", l: "Compra de post" },
  { v: "subscription", l: "Assinatura" },
  { v: "chat_unlock", l: "Chat" },
  { v: "tip", l: "Mimo" },
  { v: "video_call", l: "Videochamada" },
  { v: "wallet_topup", l: "Recarga" },
  { v: "withdrawal", l: "Saque" },
];
const STATUS_OPTS = [
  { v: "", l: "Todos status" },
  { v: "paid", l: "Pago" },
  { v: "pending", l: "Pendente" },
  { v: "failed", l: "Falhou" },
  { v: "refunded", l: "Reembolsado" },
  { v: "cancelled", l: "Cancelado" },
];
const METHOD_OPTS = [
  { v: "", l: "Todos métodos" },
  { v: "pix", l: "Pix" },
  { v: "credit_card", l: "Cartão" },
  { v: "boleto", l: "Boleto" },
  { v: "wallet", l: "Carteira" },
];

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AdminTransactions() {
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchTx = useServerFn(listAdminTransactions);
  const q = useQuery({
    queryKey: ["admin-tx", kind, status, method, page],
    queryFn: () =>
      fetchTx({
        data: {
          kind: kind || null,
          status: status || null,
          method: method || null,
          limit,
          offset: page * limit,
        },
      }),
    staleTime: 15_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={kind} onChange={setKind} options={KIND_OPTS} />
        <Select value={status} onChange={setStatus} options={STATUS_OPTS} />
        <Select value={method} onChange={setMethod} options={METHOD_OPTS} />
      </div>

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : q.error || !q.data ? (
          <div className="p-6 text-destructive text-sm">Erro ao carregar.</div>
        ) : q.data.rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Nenhuma transação.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Data</th>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-left px-3 py-2">Comprador</th>
                  <th className="text-left px-3 py-2">Criador</th>
                  <th className="text-left px-3 py-2">Método</th>
                  <th className="text-right px-3 py-2">Bruto</th>
                  <th className="text-right px-3 py-2">Taxa</th>
                  <th className="text-right px-3 py-2">Líquido</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {q.data.rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-3 py-2">{r.kind}</td>
                    <td className="px-3 py-2">{r.buyerUsername ?? "—"}</td>
                    <td className="px-3 py-2">{r.creatorUsername ?? "—"}</td>
                    <td className="px-3 py-2">{r.payment_method ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{brl(r.amount_cents_gross)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {brl((r.platform_fee_cents ?? 0) + (r.gateway_fee_cents ?? 0))}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{brl(r.net_cents)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === "paid"
                            ? "bg-primary/10 text-primary"
                            : r.status === "failed" || r.status === "cancelled"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {q.data && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {q.data.count} resultados · página {page + 1}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-md border border-border disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={(page + 1) * limit >= q.data.count}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-md border border-border disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm px-3 py-1.5 rounded-md border border-border bg-background"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
