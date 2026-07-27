import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listAuditLogs } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AdminAudit,
});

function AdminAudit() {
  const [term, setTerm] = useState("");
  const fetchFn = useServerFn(listAuditLogs);
  const q = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => fetchFn({ data: { limit: 300 } }),
    staleTime: 20_000,
  });

  const rows = (q.data ?? []).filter((r: any) => {
    if (!term.trim()) return true;
    const t = term.toLowerCase();
    return (
      r.action?.toLowerCase().includes(t) ||
      r.target_table?.toLowerCase().includes(t) ||
      r.target_id?.toLowerCase().includes(t) ||
      r.actor_id?.toLowerCase().includes(t)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrar por ação, tabela, id…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-xs text-muted-foreground">
          {rows.length} de {q.data?.length ?? 0}
        </span>
      </div>
      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Sem registros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Quando</th>
                  <th className="text-left px-3 py-2">Ator</th>
                  <th className="text-left px-3 py-2">Ação</th>
                  <th className="text-left px-3 py-2">Alvo</th>
                  <th className="text-left px-3 py-2">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono truncate max-w-[160px]">
                      {r.actor_id}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {r.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.target_table ?? "—"}
                      {r.target_id && (
                        <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[160px]">
                          {r.target_id}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground max-w-[320px]">
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(r.metadata ?? {}, null, 0)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
