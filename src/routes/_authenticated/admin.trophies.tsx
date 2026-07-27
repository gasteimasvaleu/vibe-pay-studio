import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listAdminTrophies, resolveTrophy } from "@/lib/admin-ops.functions";
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

export const Route = createFileRoute("/_authenticated/admin/trophies")({
  component: () => <AdminTrophies />,
});

const FILTERS = [
  { v: "", l: "Todas" },
  { v: "pending", l: "Pendentes" },
  { v: "approved", l: "Aprovadas" },
  { v: "shipped", l: "Enviadas" },
  { v: "delivered", l: "Entregues" },
  { v: "rejected", l: "Recusadas" },
];

function AdminTrophies() {
  const [status, setStatus] = useState("pending");
  const listFn = useServerFn(listAdminTrophies);
  const resFn = useServerFn(resolveTrophy);
  const qc = useQueryClient();
  const [target, setTarget] = useState<{ id: string; status: any } | null>(null);
  const [notes, setNotes] = useState("");

  const q = useQuery({
    queryKey: ["admin-trophies", status],
    queryFn: () => listFn({ data: { status: status || undefined } }),
    staleTime: 10_000,
  });

  async function submit() {
    if (!target) return;
    try {
      await resFn({ data: { trophyId: target.id, status: target.status, notes } });
      toast.success("Solicitação atualizada");
      setTarget(null);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["admin-trophies"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <AdminTablePage
      loading={q.isLoading}
      empty={(q.data ?? []).length === 0}
      filters={<PillFilters value={status} onChange={setStatus} options={FILTERS} />}
      headers={["Criador", "Marco", "Status", "Notas", "Solicitado", "Ação"]}
      rows={(q.data ?? []).map((r: any) => [
        <ProfileCell p={r.user} />,
        <span className="text-xs">{brl(Number(r.milestone_cents))}</span>,
        <span className="text-xs">{r.status}</span>,
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
          {r.admin_notes ?? "—"}
        </span>,
        <span className="text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>,
        <div className="flex gap-2 flex-wrap">
          {r.status === "pending" && (
            <>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setTarget({ id: r.id, status: "approved" })}
              >
                Aprovar
              </button>
              <button
                className="text-xs text-destructive hover:underline"
                onClick={() => setTarget({ id: r.id, status: "rejected" })}
              >
                Recusar
              </button>
            </>
          )}
          {r.status === "approved" && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => setTarget({ id: r.id, status: "shipped" })}
            >
              Marcar enviada
            </button>
          )}
          {r.status === "shipped" && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => setTarget({ id: r.id, status: "delivered" })}
            >
              Marcar entregue
            </button>
          )}
        </div>,
      ])}
      dialog={
        <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atualizar solicitação → {target?.status}</DialogTitle>
            </DialogHeader>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas (opcional)"
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setTarget(null)}>
                Cancelar
              </Button>
              <Button onClick={submit}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}
