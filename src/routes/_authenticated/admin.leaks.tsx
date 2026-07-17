import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listAdminLeakReports,
  updateLeakReport,
} from "@/lib/leak-reports.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Check,
  X as XIcon,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/leaks")({
  component: AdminLeaks,
});

const FILTERS = [
  { v: "open,reviewing", l: "Abertas" },
  { v: "resolved", l: "Resolvidas" },
  { v: "dismissed", l: "Descartadas" },
  { v: "", l: "Todas" },
] as const;

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  open: { label: "Aberta", className: "bg-amber-500/15 text-amber-600" },
  reviewing: { label: "Em análise", className: "bg-blue-500/15 text-blue-600" },
  resolved: { label: "Resolvida", className: "bg-emerald-500/15 text-emerald-600" },
  dismissed: { label: "Descartada", className: "bg-muted text-muted-foreground" },
};

function AdminLeaks() {
  const [status, setStatus] = useState("open,reviewing");
  const [openId, setOpenId] = useState<string | null>(null);
  const listFn = useServerFn(listAdminLeakReports);
  const updateFn = useServerFn(updateLeakReport);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-leaks", status],
    queryFn: () => listFn({ data: { status, limit: 100 } }),
    staleTime: 15_000,
  });

  async function act(
    id: string,
    next: "reviewing" | "resolved" | "dismissed",
    adminNotes?: string,
  ) {
    try {
      await updateFn({ data: { id, status: next, adminNotes } });
      toast.success("Denúncia atualizada");
      qc.invalidateQueries({ queryKey: ["admin-leaks"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
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

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : q.error ? (
          <div className="p-6 text-destructive text-sm">
            Erro: {(q.error as any)?.message}
          </div>
        ) : !q.data || q.data.rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Nenhuma denúncia neste filtro.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {q.data.rows.map((r: any) => {
              const isOpen = openId === r.id;
              const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.open;
              return (
                <div key={r.id} className="p-4">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : r.id)}
                    className="w-full flex items-start gap-3 text-left"
                  >
                    <span className="mt-1 text-muted-foreground">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${st.className}`}
                        >
                          {st.label}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {r.title}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>
                          @{r.reporter?.username ?? "usuário removido"}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                        </span>
                        {r.evidence_paths?.length ? (
                          <>
                            <span>·</span>
                            <span>{r.evidence_paths.length} mídia(s)</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-4 pl-7 space-y-4">
                      <a
                        href={r.leak_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
                      >
                        {r.leak_url}
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>

                      <div className="text-sm whitespace-pre-wrap text-foreground">
                        {r.description}
                      </div>

                      {r.evidences?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {r.evidences.map((ev: any, idx: number) =>
                            ev.url ? (
                              <a
                                key={idx}
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block h-24 w-24 rounded-lg overflow-hidden border border-border bg-muted"
                              >
                                <img
                                  src={ev.url}
                                  alt={`Evidência ${idx + 1}`}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display =
                                      "none";
                                  }}
                                />
                              </a>
                            ) : (
                              <span
                                key={idx}
                                className="h-24 w-24 rounded-lg border border-border bg-muted text-xs text-muted-foreground grid place-items-center"
                              >
                                Sem acesso
                              </span>
                            ),
                          )}
                        </div>
                      ) : null}

                      <NotesAndActions
                        report={r}
                        onAct={(next, notes) => act(r.id, next, notes)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function NotesAndActions({
  report,
  onAct,
}: {
  report: any;
  onAct: (
    next: "reviewing" | "resolved" | "dismissed",
    notes?: string,
  ) => void | Promise<void>;
}) {
  const [notes, setNotes] = useState<string>(report.admin_notes ?? "");
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Notas internas
      </label>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
        rows={3}
        placeholder="Observações sobre a análise..."
      />
      <div className="flex gap-2 flex-wrap pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAct("reviewing", notes)}
        >
          <Eye className="h-4 w-4 mr-1" /> Em análise
        </Button>
        <Button
          size="sm"
          onClick={() => onAct("resolved", notes)}
        >
          <Check className="h-4 w-4 mr-1" /> Resolvida
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAct("dismissed", notes)}
        >
          <XIcon className="h-4 w-4 mr-1" /> Descartar
        </Button>
      </div>
    </div>
  );
}
