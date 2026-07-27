import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listAdminSubscriptions, cancelSubscription } from "@/lib/admin-ops.functions";
import { AdminTablePage, PillFilters, ProfileCell, brl } from "@/components/admin/AdminShared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: () => <AdminSubs />,
});

const FILTERS = [
  { v: "", l: "Todas" },
  { v: "active", l: "Ativas" },
  { v: "cancelled", l: "Canceladas" },
  { v: "expired", l: "Expiradas" },
  { v: "pending", l: "Pendentes" },
];

function AdminSubs() {
  const [status, setStatus] = useState("");
  const listFn = useServerFn(listAdminSubscriptions);
  const cancelFn = useServerFn(cancelSubscription);
  const qc = useQueryClient();
  const [target, setTarget] = useState<{ id: string; immediate: boolean } | null>(null);
  const [reason, setReason] = useState("");

  const q = useQuery({
    queryKey: ["admin-subs", status],
    queryFn: () => listFn({ data: { status: status || undefined } }),
    staleTime: 10_000,
  });

  async function handleCancel() {
    if (!target) return;
    try {
      await cancelFn({
        data: { subscriptionId: target.id, immediate: target.immediate, reason },
      });
      toast.success("Assinatura atualizada");
      setTarget(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-subs"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <AdminTablePage
      loading={q.isLoading}
      empty={(q.data ?? []).length === 0}
      filters={<PillFilters value={status} onChange={setStatus} options={FILTERS} />}
      headers={["Assinante", "Criador", "Plano", "Valor", "Auto", "Status", "Vence", "Ação"]}
      rows={(q.data ?? []).map((r: any) => [
        <ProfileCell p={r.subscriber} />,
        <ProfileCell p={r.creator} />,
        <span className="text-xs">{r.plan}</span>,
        <span className="text-xs">{brl(r.price_cents_paid)}</span>,
        <span className="text-xs">{r.auto_renew ? "on" : "off"}</span>,
        <span className="text-xs">{r.status}</span>,
        <span className="text-xs">
          {new Date(r.current_period_end).toLocaleDateString("pt-BR")}
        </span>,
        r.status === "active" ? (
          <div className="flex gap-2">
            <button
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => setTarget({ id: r.id, immediate: false })}
            >
              Desligar auto
            </button>
            <button
              className="text-xs text-destructive hover:underline"
              onClick={() => setTarget({ id: r.id, immediate: true })}
            >
              Encerrar já
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
      ])}
      dialog={
        <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {target?.immediate ? "Encerrar assinatura agora?" : "Desligar auto-renovação?"}
              </DialogTitle>
            </DialogHeader>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (registrado em auditoria)"
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={reason.trim().length < 3}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}
