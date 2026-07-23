import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminAccess } from "@/lib/admin-dashboard.functions";
import { listRefundRequests, approveRefund, rejectRefund, type AdminRefundRequest } from "@/lib/admin-refunds.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/refunds")({
  head: () => ({
    meta: [
      { title: "Reembolsos · Admin · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    try {
      await requireAdminAccess();
    } catch {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RefundsAdminPage,
});

function brl(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function RefundsAdminPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listRefundRequests);
  const approveFn = useServerFn(approveRefund);
  const rejectFn = useServerFn(rejectRefund);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "refunds"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const [selected, setSelected] = useState<AdminRefundRequest | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleConfirm() {
    if (!selected || !action) return;
    setIsSaving(true);
    try {
      if (action === "approve") {
        await approveFn({ data: { requestId: selected.id, adminNotes: notes.trim() || undefined } });
        toast.success("Reembolso aprovado e estornado no Asaas");
      } else {
        await rejectFn({ data: { requestId: selected.id, adminNotes: notes.trim() || undefined } });
        toast.success("Reembolso rejeitado");
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "refunds"] });
      setSelected(null);
      setAction(null);
      setNotes("");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao processar reembolso");
    } finally {
      setIsSaving(false);
    }
  }

  function openAction(item: AdminRefundRequest, a: "approve" | "reject") {
    setSelected(item);
    setAction(a);
    setNotes("");
  }

  function closeDialog() {
    setSelected(null);
    setAction(null);
    setNotes("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Solicitações de reembolso</h2>
      </div>

      {isLoading && (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="py-8 text-center text-sm text-destructive">Erro ao carregar solicitações.</p>
      )}

      {!isLoading && !error && (data ?? []).length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma solicitação de reembolso.</p>
      )}

      <div className="space-y-2">
        {(data ?? []).map((item) => (
          <div
            key={item.id}
            className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border border-border bg-card"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {item.referenceType.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
              </div>
              <p className="text-sm font-medium">
                {item.buyer?.displayName || item.buyer?.username || "Usuário"} ({item.userId.slice(0, 8)})
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">{item.reason}</p>
              {item.adminNotes && (
                <p className="text-[11px] text-muted-foreground italic">Nota: {item.adminNotes}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-sm font-semibold text-primary">{brl(item.amountCents)}</div>
                <div className="text-[11px] text-muted-foreground capitalize">{item.status}</div>
              </div>
              {item.status === "pending" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => openAction(item, "reject")}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Rejeitar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => openAction(item, "approve")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aprovar
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Aprovar reembolso" : "Rejeitar reembolso"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? `O valor de ${selected ? brl(selected.amountCents) : ""} será estornado no Asaas e o acesso ao conteúdo será revogado.`
                : `A solicitação de ${selected ? brl(selected.amountCents) : ""} será recusada.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Nota interna (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSaving}
              className={
                action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-destructive hover:bg-destructive/90 text-white"
              }
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {action === "approve" ? "Confirmar estorno" : "Confirmar rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
