import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listAdminPromotions, updatePromotionStatus } from "@/lib/admin-ops.functions";
import { AdminTablePage, PillFilters, ProfileCell } from "@/components/admin/AdminShared";

export const Route = createFileRoute("/_authenticated/admin/promotions")({
  component: () => <AdminProm />,
});

const FILTERS = [
  { v: "", l: "Todas" },
  { v: "active", l: "Ativas" },
  { v: "paused", l: "Pausadas" },
  { v: "ended", l: "Encerradas" },
];

function AdminProm() {
  const [status, setStatus] = useState("");
  const listFn = useServerFn(listAdminPromotions);
  const upFn = useServerFn(updatePromotionStatus);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-promotions", status],
    queryFn: () => listFn({ data: { status: status || undefined } }),
    staleTime: 10_000,
  });

  async function set(promotionId: string, s: "paused" | "ended" | "active") {
    try {
      await upFn({ data: { promotionId, status: s } });
      toast.success("Promoção atualizada");
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <AdminTablePage
      loading={q.isLoading}
      empty={(q.data ?? []).length === 0}
      filters={<PillFilters value={status} onChange={setStatus} options={FILTERS} />}
      headers={["Criador", "Nome", "Desconto", "Preço", "Uso", "Status", "Período", "Ação"]}
      rows={(q.data ?? []).map((r: any) => [
        <ProfileCell p={r.creator} />,
        <span className="text-xs">{r.name}</span>,
        <span className="text-xs">{r.discount_pct}%</span>,
        <span className="text-xs">R$ {Number(r.promo_price).toFixed(2)}</span>,
        <span className="text-xs">
          {r.subscriptions_used}/{r.max_subscriptions}
        </span>,
        <span className="text-xs">{r.status}</span>,
        <span className="text-xs">
          {new Date(r.starts_at).toLocaleDateString("pt-BR")} →{" "}
          {new Date(r.ends_at).toLocaleDateString("pt-BR")}
        </span>,
        <div className="flex gap-2">
          {r.status === "active" && (
            <button
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => set(r.id, "paused")}
            >
              Pausar
            </button>
          )}
          {r.status === "paused" && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => set(r.id, "active")}
            >
              Reativar
            </button>
          )}
          {r.status !== "ended" && (
            <button
              className="text-xs text-destructive hover:underline"
              onClick={() => set(r.id, "ended")}
            >
              Encerrar
            </button>
          )}
        </div>,
      ])}
    />
  );
}
