import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  banUser,
  listAdminUsers,
  unbanUser,
} from "@/lib/admin-dashboard.functions";
import { adminRefreshKyc } from "@/lib/onboarding.functions";
import { Card } from "@/components/ui/card";
import { Loader2, Ban, ShieldCheck, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [term, setTerm] = useState("");
  const [role, setRole] = useState<"" | "admin" | "moderator" | "creator" | "subscriber">("");
  const [banned, setBanned] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const listFn = useServerFn(listAdminUsers);
  const banFn = useServerFn(banUser);
  const unbanFn = useServerFn(unbanUser);
  const refreshKycFn = useServerFn(adminRefreshKyc);
  const qc = useQueryClient();
  const [kycBusy, setKycBusy] = useState<string | null>(null);

  async function handleRefreshKyc(userId: string) {
    setKycBusy(userId);
    try {
      const r = await refreshKycFn({ data: { userId } });
      if (r.ok) {
        toast.success(`KYC atualizado: ${r.status}`);
        qc.invalidateQueries({ queryKey: ["admin-users"] });
      } else {
        toast.error(r.message ?? "Falha ao consultar KYC");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    } finally {
      setKycBusy(null);
    }
  }

  const q = useQuery({
    queryKey: ["admin-users", term, role, banned, page],
    queryFn: () =>
      listFn({
        data: {
          q: term || null,
          role: role || null,
          banned: banned === "" ? null : banned === "true",
          limit,
          offset: page * limit,
        },
      }),
    staleTime: 15_000,
  });

  const [banTarget, setBanTarget] = useState<{ id: string; username: string } | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleBan() {
    if (!banTarget) return;
    setBusy(true);
    try {
      await banFn({ data: { userId: banTarget.id, reason } });
      toast.success("Usuário banido");
      setBanTarget(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao banir");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnban(userId: string) {
    try {
      await unbanFn({ data: { userId } });
      toast.success("Banimento removido");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar usuário…"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          className="text-sm px-3 py-1.5 rounded-md border border-border bg-background"
        >
          <option value="">Todas as roles</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderador</option>
          <option value="creator">Creator</option>
          <option value="subscriber">Subscriber</option>
        </select>
        <select
          value={banned}
          onChange={(e) => setBanned(e.target.value as any)}
          className="text-sm px-3 py-1.5 rounded-md border border-border bg-background"
        >
          <option value="">Ativos + banidos</option>
          <option value="false">Somente ativos</option>
          <option value="true">Somente banidos</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : q.error || !q.data ? (
          <div className="p-6 text-destructive text-sm">Erro.</div>
        ) : q.data.rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Sem usuários.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Usuário</th>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-left px-3 py-2">Roles</th>
                  <th className="text-left px-3 py-2">KYC</th>
                  <th className="text-left px-3 py-2">Cadastro</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {q.data.rows.map((u: any) => (
                  <tr key={u.user_id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted" />
                        )}
                        <div>
                          <Link
                            to="/$username"
                            params={{ username: u.username }}
                            className="font-medium hover:underline"
                          >
                            @{u.username}
                          </Link>
                          {u.display_name && (
                            <div className="text-xs text-muted-foreground">
                              {u.display_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{u.account_type ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {u.roles.map((r: string) => (
                          <span
                            key={r}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span>{u.kyc_status ?? "—"}</span>
                        {(u.kyc_status === "processing" ||
                          u.kyc_status === "not_started") && (
                          <button
                            onClick={() => handleRefreshKyc(u.user_id)}
                            disabled={kycBusy === u.user_id}
                            title="Reconsultar Veriff"
                            className="inline-flex items-center text-primary hover:opacity-80 disabled:opacity-40"
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${
                                kycBusy === u.user_id ? "animate-spin" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </td>
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      {u.banned_at ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive"
                          title={u.ban_reason ?? ""}
                        >
                          Banido
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {u.banned_at ? (
                        <button
                          onClick={() => handleUnban(u.user_id)}
                          className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Desbanir
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setBanTarget({ id: u.user_id, username: u.username })
                          }
                          className="text-xs inline-flex items-center gap-1 text-destructive hover:underline"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Banir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {q.data && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {q.data.count} · página {page + 1}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-md border border-border disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={(page + 1) * limit >= q.data.count}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-md border border-border disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banir @{banTarget?.username}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O usuário perderá acesso ao app. Descreva o motivo (armazenado em log de auditoria):
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo do banimento"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busy || reason.trim().length < 3}
              onClick={handleBan}
            >
              {busy ? "Banindo…" : "Confirmar banimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
