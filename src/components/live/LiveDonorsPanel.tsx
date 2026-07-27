import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Crown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Donor {
  buyer_id: string;
  totalCents: number;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface LiveDonorsPanelProps {
  liveId: string;
  variant?: "card" | "sheet";
  collapsible?: boolean;
  className?: string;
}

async function fetchDonors(liveId: string): Promise<Donor[]> {
  const { data: tx } = await supabase
    .from("transactions")
    .select("buyer_id, amount_cents_gross, kind, status, reference_id, reference_table")
    .eq("reference_table", "live_sessions")
    .eq("reference_id", liveId)
    .eq("status", "paid")
    .in("kind", ["live_ticket", "live_tip"] as any)
    .limit(500);
  const totals = new Map<string, number>();
  for (const t of (tx ?? []) as any[]) {
    if (!t.buyer_id) continue;
    totals.set(t.buyer_id, (totals.get(t.buyer_id) ?? 0) + (t.amount_cents_gross ?? 0));
  }
  const ids = Array.from(totals.keys());
  if (ids.length === 0) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);
  const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
  return ids
    .map<Donor>((id) => {
      const p: any = byId.get(id);
      return {
        buyer_id: id,
        totalCents: totals.get(id) ?? 0,
        username: p?.username ?? null,
        displayName: p?.display_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 10);
}

export function LiveDonorsPanel({ liveId, variant = "card", collapsible = false, className }: LiveDonorsPanelProps) {
  const isSheet = variant === "sheet";
  const [open, setOpen] = useState(true);
  const { data: donors, isLoading } = useQuery({
    queryKey: ["live-donors", liveId],
    queryFn: () => fetchDonors(liveId),
    refetchInterval: 30_000,
  });

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        isSheet ? "" : "bg-card border rounded-lg",
        className,
      )}
    >
      <div className="px-3 py-2 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top apoiadores</p>
        </div>
        {collapsible && (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setOpen((v) => !v)}>
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
      {open && (
        <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
          {isLoading && <p className="text-xs text-muted-foreground text-center py-3">Carregando…</p>}
          {!isLoading && (!donors || donors.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-3">Seja o primeiro a apoiar</p>
          )}
          {(donors ?? []).map((d, idx) => (
            <div key={d.buyer_id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
              <div className="w-5 text-xs font-bold text-muted-foreground text-center">
                {idx === 0 ? <Crown className="h-4 w-4 text-amber-500 mx-auto" /> : idx + 1}
              </div>
              {d.avatarUrl ? (
                <img src={d.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.displayName || d.username || "Apoiador"}</p>
                {d.username && <p className="text-[11px] text-muted-foreground truncate">@{d.username}</p>}
              </div>
              <p className="text-xs font-bold text-primary">R$ {(d.totalCents / 100).toFixed(2).replace(".", ",")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
