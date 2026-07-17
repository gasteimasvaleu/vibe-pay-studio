import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listAdminReports } from "@/lib/admin-dashboard.functions";
import { resolveReport } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Loader2, Check, X, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  component: AdminModeration;
});

const FILTERS = [
  { v: "open,reviewing", l: "Abertas" },
  { v: "actioned", l: "Aplicadas" },
  { v: "dismissed", l: "Descartadas" },
  { v: "", l: "Todas" },
] as const;

function AdminModeration() {
  const [status, setStatus] = useState("open,reviewing");
  const listFn = useServerFn(listAdminReports);
  const resolveFn = useServerFn(resolveReport);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: () => listFn({ data: { status, limit: 200 } }),
    staleTime: 15_000,
  });

  async function act(reportId: string, action: "actioned" | "dismissed" | "reviewing") {
    try {
      await resolveFn({ data: { reportId, status: action } });
      toast.success("Denúncia atualizada");
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

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

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : q.error || !q.data ? (
          <div className="p-6 text-destructive text-sm">Erro.</div>
        ) : q.data.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Sem denúncias.</div>
        ) : (
          <div className="divide-y divide-border">
            {q.data.map((r: any) => (
              <div key={r.id} className="p-4 flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                      {r.target_type}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === "open" || r.status === "reviewing"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : r.status === "actioned"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {r.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-medium">{r.reason}</div>
                  {r.details && (
                    <div className="mt-1 text-sm text-muted-foreground">{r.details}</div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Alvo: <code>{r.target_id}</code>
                    {r.reporter && (
                      <>
                        {" "}· por @{r.reporter.username}
                      </>
                    )}
                  </div>
                </div>
                {(r.status === "open" || r.status === "reviewing") && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => act(r.id, "reviewing")}
                      className="p-2 rounded-md border border-border hover:bg-accent"
                      title="Em análise"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => act(r.id, "dismissed")}
                      className="p-2 rounded-md border border-border hover:bg-accent"
                      title="Descartar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => act(r.id, "actioned")}
                      className="p-2 rounded-md bg-destructive text-destructive-foreground hover:opacity-90"
                      title="Aplicar sanção"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
