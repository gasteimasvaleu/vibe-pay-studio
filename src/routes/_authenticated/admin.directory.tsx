import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  adminListPublicListings,
  adminReviewPublicListing,
} from "@/lib/public-directory.functions";

export const Route = createFileRoute("/_authenticated/admin/directory")({
  component: AdminDirectory,
});

const FILTERS = [
  { v: "pending", l: "Pendentes" },
  { v: "approved", l: "Na vitrine" },
  { v: "rejected", l: "Recusados" },
] as const;

function AdminDirectory() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const listFn = useServerFn(adminListPublicListings);
  const reviewFn = useServerFn(adminReviewPublicListing);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-directory", status],
    queryFn: () => listFn({ data: { status } }),
  });

  async function act(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    try {
      await reviewFn({ data: { id, status: decision } });
      toast.success(decision === "approved" ? "Perfil na vitrine." : "Perfil fora da vitrine.");
      qc.invalidateQueries({ queryKey: ["admin-directory"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Vitrine pública</h1>
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button key={f.v} size="sm" variant={status === f.v ? "default" : "outline"} onClick={() => setStatus(f.v)}>
            {f.l}
          </Button>
        ))}
      </div>
      {q.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada por aqui.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {(q.data ?? []).map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <div className="aspect-[3/1] bg-muted">
                {r.cover_url && <img src={r.cover_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
                    {r.avatar_url && <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{r.display_name ?? r.username}</p>
                    <p className="text-xs text-muted-foreground">@{r.username}</p>
                  </div>
                </div>
                {r.bio && <p className="text-sm text-muted-foreground whitespace-pre-line">{r.bio}</p>}
                <div className="flex gap-2 pt-2">
                  {status !== "approved" && (
                    <Button size="sm" disabled={busy === r.id} onClick={() => act(r.id, "approved")}>Aprovar</Button>
                  )}
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => act(r.id, "rejected")}>
                    {status === "approved" ? "Tirar da vitrine" : "Recusar"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
