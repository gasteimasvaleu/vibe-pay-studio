import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listAdminLives, endLive } from "@/lib/admin-ops.functions";
import { AdminTablePage, PillFilters, ProfileCell, brl, ReasonPrompt } from "@/components/admin/AdminShared";

export const Route = createFileRoute("/_authenticated/admin/lives")({
  component: () => <AdminLives />,
});

const FILTERS = [
  { v: "", l: "Todas" },
  { v: "live", l: "Ao vivo" },
  { v: "scheduled", l: "Agendadas" },
  { v: "ended", l: "Encerradas" },
];

function AdminLives() {
  const [status, setStatus] = useState("");
  const listFn = useServerFn(listAdminLives);
  const endFn = useServerFn(endLive);
  const qc = useQueryClient();
  const [target, setTarget] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-lives", status],
    queryFn: () => listFn({ data: { status: status || undefined } }),
    staleTime: 10_000,
  });

  async function handleEnd(reason: string) {
    if (!target) return;
    try {
      await endFn({ data: { liveId: target, reason } });
      toast.success("Live encerrada");
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-lives"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <AdminTablePage
      loading={q.isLoading}
      empty={(q.data ?? []).length === 0}
      filters={<PillFilters value={status} onChange={setStatus} options={FILTERS} />}
      headers={["Criador", "Título", "Status", "Views", "Bruto", "Início", "Ação"]}
      rows={(q.data ?? []).map((r: any) => [
        <ProfileCell p={r.creator} />,
        <span className="text-xs">{r.title ?? "—"}</span>,
        <StatusBadge s={r.status} />,
        <span className="text-xs">{r.total_views} (pico {r.viewers_peak})</span>,
        <span className="text-xs">{brl(r.gross_cents)}</span>,
        <span className="text-xs">{new Date(r.started_at).toLocaleString("pt-BR")}</span>,
        r.status === "live" ? (
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
          title="Encerrar live"
          onConfirm={handleEnd}
        />
      }
    />
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    live: "bg-red-500/15 text-red-600",
    scheduled: "bg-amber-500/15 text-amber-600",
    ended: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${map[s] ?? "bg-muted"}`}>{s}</span>
  );
}
