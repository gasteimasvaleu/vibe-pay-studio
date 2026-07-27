import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listAdminStories, removeStory } from "@/lib/admin-ops.functions";
import { AdminTablePage, PillFilters, ProfileCell, brl, ReasonPrompt } from "@/components/admin/AdminShared";

export const Route = createFileRoute("/_authenticated/admin/stories")({
  component: () => <AdminStories />,
});

const FILTERS = [
  { v: "", l: "Todos" },
  { v: "active", l: "Ativos" },
];

function AdminStories() {
  const [f, setF] = useState("");
  const listFn = useServerFn(listAdminStories);
  const rmFn = useServerFn(removeStory);
  const qc = useQueryClient();
  const [target, setTarget] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-stories", f],
    queryFn: () => listFn({ data: { onlyActive: f === "active" } }),
    staleTime: 10_000,
  });

  async function handleRm(reason: string) {
    if (!target) return;
    try {
      await rmFn({ data: { storyId: target, reason } });
      toast.success("Story removido");
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-stories"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <AdminTablePage
      loading={q.isLoading}
      empty={(q.data ?? []).length === 0}
      filters={<PillFilters value={f} onChange={setF} options={FILTERS} />}
      headers={["Criador", "Tipo", "Preço", "Legenda", "Publicado", "Expira", "Ação"]}
      rows={(q.data ?? []).map((r: any) => [
        <ProfileCell p={r.creator} />,
        <span className="text-xs">{r.media_type}</span>,
        <span className="text-xs">{r.price_cents ? brl(r.price_cents) : "Grátis"}</span>,
        <span className="text-xs truncate max-w-[220px] block">{r.caption ?? "—"}</span>,
        <span className="text-xs">{new Date(r.published_at).toLocaleString("pt-BR")}</span>,
        <span className="text-xs">{new Date(r.expires_at).toLocaleString("pt-BR")}</span>,
        <button
          className="text-xs text-destructive hover:underline"
          onClick={() => setTarget(r.id)}
        >
          Remover
        </button>,
      ])}
      dialog={
        <ReasonPrompt
          open={!!target}
          onOpenChange={(o) => !o && setTarget(null)}
          title="Remover story"
          onConfirm={handleRm}
        />
      }
    />
  );
}
