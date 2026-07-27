import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "@/lib/admin-ops.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: () => <AdminSettings />,
});

const FIELDS: {
  key: string;
  label: string;
  hint?: string;
  type: "number" | "toggle";
}[] = [
  { key: "commission_pct_national", label: "Comissão nacional (%)", type: "number" },
  {
    key: "commission_pct_international",
    label: "Comissão internacional (%)",
    type: "number",
  },
  { key: "gateway_fee_pct", label: "Taxa gateway (%)", type: "number" },
  { key: "min_ppv_cents", label: "PPV mínimo (centavos)", type: "number" },
  { key: "min_dm_cents", label: "DM paga mínima (centavos)", type: "number" },
  {
    key: "min_videocall_cents",
    label: "Videochamada mínima (centavos)",
    type: "number",
  },
  {
    key: "min_withdrawal_cents",
    label: "Saque mínimo (centavos)",
    type: "number",
  },
  { key: "feature_lives_enabled", label: "Lives habilitadas", type: "toggle" },
  {
    key: "feature_broadcasts_enabled",
    label: "Broadcasts habilitados",
    type: "toggle",
  },
  {
    key: "feature_videocalls_enabled",
    label: "Videochamadas habilitadas",
    type: "toggle",
  },
  { key: "feature_stories_enabled", label: "Stories habilitados", type: "toggle" },
];

function AdminSettings() {
  const getFn = useServerFn(getPlatformSettings);
  const upFn = useServerFn(updatePlatformSettings);
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => getFn(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  async function save() {
    setSaving(true);
    try {
      const patch: Record<string, any> = {};
      FIELDS.forEach((f) => (patch[f.key] = form[f.key]));
      await upFn({ data: patch });
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    } finally {
      setSaving(false);
    }
  }

  if (q.isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-medium">Configurações da plataforma</h3>
        <div className="text-xs text-muted-foreground">
          Alterações são registradas em auditoria e afetam todos os fluxos que leem
          esses valores.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-xs text-muted-foreground">{f.label}</label>
              {f.type === "number" ? (
                <Input
                  type="number"
                  value={form[f.key] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: Number(e.target.value) })
                  }
                />
              ) : (
                <label className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    checked={!!form[f.key]}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.checked })
                    }
                  />
                  <span className="text-sm">
                    {form[f.key] ? "Habilitado" : "Desabilitado"}
                  </span>
                </label>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
