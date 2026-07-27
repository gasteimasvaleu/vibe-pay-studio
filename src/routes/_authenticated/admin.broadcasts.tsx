import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listAdminBroadcasts, cancelBroadcast } from "@/lib/admin-ops.functions";
import { AdminTablePage, PillFilters, ProfileCell, brl, ReasonPrompt } from "@/components/admin/AdminShared";

export const Route = createFileRoute("/_authenticated/admin/broadcasts")({
  component: () => <AdminBroadcasts />,
});

const FILTERS = [
  { v: "", l: "Todos" },
  { v: "queued", l: "Fila" },
  { v: "scheduled", l: "Agendados" },
  { v: "sending", l: "Enviando" },
  { v: "sent", l: "Enviados" },
  { v: "cancelled", l: "Cancelados" },
];

function AdminBroadcasts() {
  const [status, setStatus] = useState("");
  const listFn = useServerFn(listAdminBroadcasts);
  const cancelFn = useServerFn(cancelBroadcast);
  const qc = useQueryClient();
  const [target, setTarget] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-broadcasts", status],
    queryFn: () => listFn({ data: { status: status || undefined } }),
    staleTime: 10_000,
  });

  async function handleCancel(reason: string) {
    if (!target) return;
    try {
      await cancelFn({ data: { jobId: target, reason } });
      toast.success("Broadcast cancelado");
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <AdminTablePage
      loading={q.isLoading}
      empty={(q.data ?? []).length === 0}
      filters={<PillFilters value={status} onChange={setStatus} options={FILTERS} />}
      headers={["Criador", "Audiência", "Preço", "Destinatários", "Enviados", "Status", "Ação"]}
      rows={(q.data ?? []).map((r: any) => [
        <ProfileCell p={r.creator} />,
        <span className="text-xs">{r.audience}</span>,
        <span className="text-xs">{r.price_cents ? brl(r.price_cents) : "Grátis"}</span>,
        <span className="text-xs">{r.total_recipients}</span>,
        <span className="text-xs">
          {r.sent_count} / {r.failed_count > 0 && `${r.failed_count} falhas`}
        </span>,
        <span className="text-xs">{r.status}</span>,
        ["queued", "scheduled"].includes(r.status) ? (
          <button
            className="text-xs text-destructive hover:underline"
            onClick={() => setTarget(r.id)}
          >
            Cancelar
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
      ])}
      dialog={
        <ReasonPrompt
          open={!!target}
          onOpenChange={(o) => !o && setTarget(null)}
          title="Cancelar broadcast"
          onConfirm={handleCancel}
        />
      }
    />
  );
}
