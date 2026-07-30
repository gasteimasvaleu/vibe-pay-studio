import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Check, Loader2, X as XIcon } from "lucide-react";
import {
  listVerificationRequests,
  reviewVerificationRequest,
} from "@/lib/verification.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  component: AdminVerifications,
});

const FILTERS = [
  { v: "pending", l: "Em análise" },
  { v: "approved", l: "Aprovados" },
  { v: "rejected", l: "Recusados" },
  { v: "", l: "Todos" },
] as const;

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "Em análise", className: "bg-amber-500/15 text-amber-600" },
  approved: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-600" },
  rejected: { label: "Recusado", className: "bg-destructive/15 text-destructive" },
};

function AdminVerifications() {
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  const listFn = useServerFn(listVerificationRequests);
  const reviewFn = useServerFn(reviewVerificationRequest);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-verifications", status],
    queryFn: () => listFn({ data: { status, limit: 100 } }),
    staleTime: 15_000,
  });

  async function act(id: string, decision: "approved" | "rejected") {
    const reason = (notes[id] ?? "").trim();
    if (decision === "rejected" && !reason) {
      toast.error("Informe o motivo da recusa.");
      return;
    }
    setBusyId(id);
    try {
      await reviewFn({ data: { id, decision, adminNotes: reason } });
      toast.success(decision === "approved" ? "Perfil certificado" : "Pedido recusado");
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao registrar decisão");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Button
            key={f.v || "all"}
            size="sm"
            variant={status === f.v ? "default" : "outline"}
            onClick={() => setStatus(f.v)}
          >
            {f.l}
          </Button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : !q.data?.rows.length ? (
        <Card className="p-4 text-sm text-muted-foreground">
          Nenhum pedido de certificação neste filtro.
        </Card>
      ) : (
        <div className="space-y-3">
          {q.data.rows.map((r: any) => {
            const badge = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending;
            return (
              <Card key={r.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    @{r.profile?.username ?? r.account?.username ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.profile?.kind === "free" ? "Perfil gratuito" : "Perfil pago"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Código informado:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {r.code}
                  </span>
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {r.photos.map((p: any) => (
                    <button
                      key={p.path}
                      type="button"
                      onClick={() => p.url && setZoom(p.url)}
                      className="aspect-[3/4] rounded-lg overflow-hidden border bg-muted"
                    >
                      {p.url ? (
                        <img
                          src={p.url}
                          alt="Foto de verificação"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          indisponível
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {r.status === "pending" ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notes[r.id] ?? ""}
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                      }
                      placeholder="Observação (obrigatória para recusar)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, "approved")}
                      >
                        <Check className="h-4 w-4 mr-1" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, "rejected")}
                      >
                        <XIcon className="h-4 w-4 mr-1" /> Recusar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {r.admin_notes && <p>Observação: {r.admin_notes}</p>}
                    {r.profile?.verified_at && (
                      <p className="flex items-center gap-1 text-primary">
                        <BadgeCheck className="h-3.5 w-3.5" /> Selo ativo
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foto de verificação</DialogTitle>
          </DialogHeader>
          {zoom && (
            <img
              src={zoom}
              alt="Foto de verificação ampliada"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
