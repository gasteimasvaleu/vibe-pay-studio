import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listAdminBugReports,
  updateBugReport,
} from "@/lib/bug-reports.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  X as XIcon,
  PlayCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/bugs")({
  component: AdminBugs,
});

const STATUS_FILTERS = [
  { v: "open,in_progress", l: "Ativos" },
  { v: "resolved", l: "Resolvidos" },
  { v: "wont_fix", l: "Não corrigir" },
  { v: "", l: "Todos" },
] as const;

const PRIORITY_FILTERS = [
  { v: "", l: "Todas" },
  { v: "high", l: "Alta" },
  { v: "medium", l: "Média" },
  { v: "low", l: "Baixa" },
] as const;

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-amber-500/15 text-amber-600" },
  in_progress: { label: "Em andamento", className: "bg-blue-500/15 text-blue-600" },
  resolved: { label: "Resolvido", className: "bg-emerald-500/15 text-emerald-600" },
  wont_fix: { label: "Não corrigir", className: "bg-muted text-muted-foreground" },
};

const PRIORITY_LABEL: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  medium: { label: "Média", className: "bg-blue-500/15 text-blue-600" },
  high: { label: "Alta", className: "bg-rose-500/15 text-rose-600" },
};

function AdminBugs() {
  const [status, setStatus] = useState<string>("open,in_progress");
  const [priority, setPriority] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);
  const listFn = useServerFn(listAdminBugReports);
  const updateFn = useServerFn(updateBugReport);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-bugs", status, priority],
    queryFn: () => listFn({ data: { status, priority, limit: 100 } }),
    staleTime: 15_000,
  });

  async function save(
    id: string,
    patch: {
      status?: "open" | "in_progress" | "resolved" | "wont_fix";
      priority?: "low" | "medium" | "high";
      adminNotes?: string;
    },
  ) {
    try {
      await updateFn({ data: { id, ...patch } });
      toast.success("Bug atualizado");
      qc.invalidateQueries({ queryKey: ["admin-bugs"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
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
      <div className="flex gap-1 flex-wrap">
        <span className="text-xs text-muted-foreground self-center mr-1">
          Prioridade:
        </span>
        {PRIORITY_FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setPriority(f.v)}
            className={`px-2.5 py-1 text-xs rounded-full border ${
              priority === f.v
                ? "bg-foreground text-background border-foreground"
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
            Nenhum bug neste filtro.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {q.data.rows.map((r: any) => {
              const isOpen = openId === r.id;
              const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.open;
              const pr =
                PRIORITY_LABEL[r.priority] ?? PRIORITY_LABEL.medium;
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
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${pr.className}`}
                        >
                          {pr.label}
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
                        {r.media_paths?.length ? (
                          <>
                            <span>·</span>
                            <span>{r.media_paths.length} mídia(s)</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-4 pl-7 space-y-4">
                      <div className="text-sm whitespace-pre-wrap text-foreground">
                        {r.description}
                      </div>

                      {r.medias?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {r.medias.map((m: any, idx: number) =>
                            m.url ? (
                              <a
                                key={idx}
                                href={m.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block h-24 w-24 rounded-lg overflow-hidden border border-border bg-muted"
                              >
                                <img
                                  src={m.url}
                                  alt={`Mídia ${idx + 1}`}
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

                      <Editor report={r} onSave={(patch) => save(r.id, patch)} />
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

function Editor({
  report,
  onSave,
}: {
  report: any;
  onSave: (patch: {
    status?: "open" | "in_progress" | "resolved" | "wont_fix";
    priority?: "low" | "medium" | "high";
    adminNotes?: string;
  }) => void | Promise<void>;
}) {
  const [notes, setNotes] = useState<string>(report.admin_notes ?? "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    report.priority ?? "medium",
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Prioridade:</span>
        {(["low", "medium", "high"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriority(p)}
            className={`px-2.5 py-1 text-xs rounded-full border ${
              priority === p
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {PRIORITY_LABEL[p].label}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Notas internas
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
          rows={3}
          placeholder="Observações sobre o bug..."
          className="mt-1"
        />
      </div>

      <div className="flex gap-2 flex-wrap pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onSave({ status: "in_progress", priority, adminNotes: notes })
          }
        >
          <PlayCircle className="h-4 w-4 mr-1" /> Em andamento
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSave({ status: "resolved", priority, adminNotes: notes })
          }
        >
          <Check className="h-4 w-4 mr-1" /> Resolvido
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            onSave({ status: "wont_fix", priority, adminNotes: notes })
          }
        >
          <XIcon className="h-4 w-4 mr-1" /> Não corrigir
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onSave({ priority, adminNotes: notes })}
        >
          Salvar sem mudar status
        </Button>
      </div>
    </div>
  );
}
