import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listAsaasEvents, listPaymentIntents } from "@/lib/admin-ops.functions";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  component: () => <AdminFinance />,
});

function AdminFinance() {
  const [tab, setTab] = useState<"events" | "intents">("events");
  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {(["events", "intents"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "events" ? "Eventos Asaas" : "Payment intents"}
          </button>
        ))}
      </div>
      {tab === "events" ? <EventsTab /> : <IntentsTab />}
    </div>
  );
}

function EventsTab() {
  const [only, setOnly] = useState(false);
  const fn = useServerFn(listAsaasEvents);
  const q = useQuery({
    queryKey: ["admin-asaas-events", only],
    queryFn: () => fn({ data: { onlyUnprocessed: only } }),
    staleTime: 15_000,
  });
  return (
    <Card className="overflow-hidden">
      <div className="p-3 border-b border-border flex items-center gap-2 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={only}
            onChange={(e) => setOnly(e.target.checked)}
          />
          Só não processados
        </label>
      </div>
      {q.isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Sem eventos.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Quando</th>
                <th className="text-left px-3 py-2">Event ID</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Processado</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 text-xs">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono truncate max-w-[200px]">
                    {r.event_id}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.event_type}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.processed_at
                      ? new Date(r.processed_at).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function IntentsTab() {
  const [only, setOnly] = useState(false);
  const fn = useServerFn(listPaymentIntents);
  const q = useQuery({
    queryKey: ["admin-intents", only],
    queryFn: () => fn({ data: { onlyPending: only } }),
    staleTime: 15_000,
  });
  return (
    <Card className="overflow-hidden">
      <div className="p-3 border-b border-border flex items-center gap-2 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={only}
            onChange={(e) => setOnly(e.target.checked)}
          />
          Só pendentes
        </label>
      </div>
      {q.isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Sem intents.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Quando</th>
                <th className="text-left px-3 py-2">Provider</th>
                <th className="text-left px-3 py-2">Método</th>
                <th className="text-left px-3 py-2">Event type</th>
                <th className="text-left px-3 py-2">TX</th>
                <th className="text-left px-3 py-2">Processado</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 text-xs">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.provider}</td>
                  <td className="px-3 py-2 text-xs">{r.method ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.event_type ?? "—"}</td>
                  <td className="px-3 py-2 text-[10px] font-mono truncate max-w-[140px]">
                    {r.transaction_id ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.processed_at
                      ? new Date(r.processed_at).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
