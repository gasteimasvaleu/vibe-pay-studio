import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listAdminVideoCalls, endVideoCall } from "@/lib/admin-ops.functions";
import { AdminTablePage, PillFilters, ProfileCell, brl, ReasonPrompt } from "@/components/admin/AdminShared";

export const Route = createFileRoute("/_authenticated/admin/videocalls")({
  component: () => <AdminVideoCalls />,
});

const FILTERS = [
  { v: "", l: "Todas" },
  { v: "requested", l: "Solicitadas" },
  { v: "accepted", l: "Aceitas" },
  { v: "completed", l: "Concluídas" },
  { v: "cancelled", l: "Canceladas" },
  { v: "expired", l: "Expiradas" },
];

function AdminVideoCalls() {
  const [status, setStatus] = useState("");
  const listFn = useServerFn(listAdminVideoCalls);
  const endFn = useServerFn(endVideoCall);
  const qc = useQueryClient();
  const [target, setTarget] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-videocalls", status],
    queryFn: () => listFn({ data: { status: status || undefined } }),
    staleTime: 10_000,
  });

  async function handleEnd(reason: string) {
    if (!target) return;
    try {
      await endFn({ data: { callId: target, reason } });
      toast.success("Chamada encerrada");
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-videocalls"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <AdminTablePage
      loading={q.isLoading}
      empty={(q.data ?? []).length === 0}
      filters={<PillFilters value={status} onChange={setStatus} options={FILTERS} />}
      headers={["Comprador", "Criador", "Duração", "Preço", "Status", "Pagto", "Início", "Ação"]}
      rows={(q.data ?? []).map((r: any) => [
        <ProfileCell p={r.requester} />,
        <ProfileCell p={r.creator} />,
        <span className="text-xs">{r.duration_minutes} min</span>,
        <span className="text-xs">{brl(r.price_cents)}</span>,
        <span className="text-xs">{r.status}</span>,
        <span className="text-xs">{r.payment_status}</span>,
        <span className="text-xs">
          {r.started_at ? new Date(r.started_at).toLocaleString("pt-BR") : "—"}
        </span>,
        r.status === "accepted" ? (
          <button
            className="text-xs text-destructive hover:underline"
            onClick={() => setTarget(r.id)}
          >
            Encerrar
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
      ])}
      dialog={
        <ReasonPrompt
          open={!!target}
          onOpenChange={(o) => !o && setTarget(null)}
          title="Encerrar videochamada"
          onConfirm={handleEnd}
        />
      }
    />
  );
}
