import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listAdminWithdrawals, getAdminPixPayoutSummary } from "@/lib/admin-dashboard.functions";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  component: AdminWithdrawals,
});

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const FILTERS = [
  { v: "requested,in_review", l: "Pendentes" },
  { v: "approved", l: "Aprovados" },
  { v: "paid", l: "Pagos" },
  { v: "failed,rejected", l: "Falharam" },
  { v: "", l: "Todos" },
] as const;

function AdminWithdrawals() {
  const [status, setStatus] = useState<string>("requested,in_review");
  const fetchFn = useServerFn(listAdminWithdrawals);
  const q = useQuery({
    queryKey: ["admin-withdrawals", status],
    queryFn: () => fetchFn({ data: { status, limit: 200 } }),
    staleTime: 15_000,
  });
  const sumFn = useServerFn(getAdminPixPayoutSummary);
  const sum = useQuery({ queryKey: ["admin-pix-summary"], queryFn: () => sumFn(), staleTime: 15_000 });
  const [modeFilter, setModeFilter] = useState<"" | "pix" | "asaas_split">("");
  const rows = (q.data ?? []).filter((w: any) => !modeFilter || w.payout_mode === modeFilter);

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setStatus(f.v)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              status === f.v
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {([["", "Todos os modos"], ["pix", "Só PIX"], ["asaas_split", "Conta Asaas"]] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setModeFilter(v)}
            className={`px-3 py-1 text-xs rounded-full border ${
              modeFilter === v
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Creators no modo Só PIX", sum.data ? String(sum.data.creators) : "—"],
          ["Liberado que a plataforma deve", sum.data ? brl(sum.data.releasedOwedCents) : "—"],
          ["A liberar (ainda em prazo)", sum.data ? brl(sum.data.pendingOwedCents) : "—"],
          [
            "Saques Só PIX pendentes",
            sum.data ? `${brl(sum.data.pendingWithdrawalsCents)} · ${sum.data.pendingWithdrawalsCount}` : "—",
          ],
        ].map(([l, v]) => (
          <Card key={l} className="p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-base font-semibold text-foreground mt-1">{v}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Saques "Só PIX" saem da conta Asaas da plataforma; mantenha saldo suficiente para cobri-los.
        Saques "Conta Asaas" saem da conta do próprio creator.
      </p>

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : q.error || !q.data ? (
          <div className="p-6 text-destructive text-sm">Erro.</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Nenhum saque.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Solicitado</th>
                  <th className="text-left px-3 py-2">Criador</th>
                  <th className="text-left px-3 py-2">Chave Pix</th>
                  <th className="text-right px-3 py-2">Bruto</th>
                  <th className="text-right px-3 py-2">Taxa</th>
                  <th className="text-right px-3 py-2">Líquido</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Processado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w: any) => (
                  <tr key={w.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(w.requested_at ?? w.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      {w.creator ? `@${w.creator.username}` : w.creator_id.slice(0, 8)}
                      <div className="text-[10px] text-muted-foreground">
                        {w.payout_mode === "pix" ? "Só PIX" : "Conta Asaas"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div>{w.pix_key_type}</div>
                      <div className="text-muted-foreground truncate max-w-[180px]">
                        {w.pix_key}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{brl(w.amount_cents)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {brl(w.fee_cents ?? 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {brl(w.net_cents ?? w.amount_cents)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          w.status === "paid"
                            ? "bg-primary/10 text-primary"
                            : w.status === "failed" || w.status === "rejected"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {w.status}
                      </span>
                      {w.rejection_reason && (
                        <div className="text-[10px] text-destructive mt-0.5">
                          {w.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {w.processed_at
                        ? new Date(w.processed_at).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
