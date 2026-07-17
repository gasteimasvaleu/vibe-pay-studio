import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getAdminOverview } from "@/lib/admin-dashboard.functions";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, Wallet, AlertCircle, Banknote } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const RANGES = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
] as const;

function AdminOverview() {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const fetchOverview = useServerFn(getAdminOverview);

  const to = new Date();
  const from = new Date(to.getTime() - Number(range) * 24 * 3600 * 1000);

  const q = useQuery({
    queryKey: ["admin-overview", range],
    queryFn: () =>
      fetchOverview({
        data: { fromIso: from.toISOString(), toIso: to.toISOString() },
      }),
    staleTime: 30_000,
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (q.error || !q.data) {
    return <div className="text-destructive">Erro ao carregar visão geral</div>;
  }
  const d = q.data;

  const chartData = d.daily.map((row) => ({
    day: new Date(row.day).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    Faturamento: row.grossCents / 100,
    Quantidade: row.txCount,
  }));

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              range === r.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Faturamento bruto"
          value={brl(d.summary.grossCents)}
          sub={`${d.summary.txCount} transações`}
        />
        <StatCard
          icon={Wallet}
          label="Receita da plataforma"
          value={brl(d.summary.platformFeeCents)}
          sub={`Gateway: ${brl(d.summary.gatewayFeeCents)}`}
        />
        <StatCard
          icon={Users}
          label="Usuários pagantes"
          value={String(d.summary.payingUsers)}
          sub={`${d.summary.earningCreators} criadores receberam`}
        />
        <StatCard
          icon={Users}
          label="Total de usuários"
          value={String(d.totalUsers)}
          sub="cadastros"
        />
      </div>

      <Card className="p-4">
        <div className="mb-3">
          <h3 className="font-medium">Faturamento no período</h3>
          <p className="text-xs text-muted-foreground">
            Roxo: faturamento bruto (R$) · Cinza: qtd de transações
          </p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `R$${v}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "Faturamento"
                    ? [brl(value * 100), name]
                    : [value, name]
                }
              />
              <Bar
                yAxisId="right"
                dataKey="Quantidade"
                fill="color-mix(in oklab, currentColor 50%, transparent)"
                className="text-muted-foreground"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Faturamento"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4 space-y-2">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Saldos em custódia
          </h3>
          <Row label="Criadores liberados" value={brl(d.wallets.creatorReleasedCents)} />
          <Row
            label="A liberar (nacional)"
            value={brl(d.wallets.creatorPendingNationalCents)}
          />
          <Row
            label="A liberar (internacional)"
            value={brl(d.wallets.creatorPendingInternationalCents)}
          />
          <Row
            label="Assinantes (créditos)"
            value={brl(d.wallets.subscriberBalanceCents)}
          />
        </Card>
        <Card className="p-4 space-y-2">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Filas
          </h3>
          <Row
            icon={Banknote}
            label="Saques pendentes"
            value={`${d.pendingWithdrawals} · ${brl(d.wallets.withdrawalsPendingCents)}`}
          />
          <Row
            icon={AlertCircle}
            label="Denúncias abertas"
            value={String(d.openReports)}
          />
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: any;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
