import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getAdminUserDetail } from "@/lib/admin-user-detail.functions";
import { grantRole, revokeRole, setKycStatus } from "@/lib/admin.functions";
import { banUser, unbanUser } from "@/lib/admin-dashboard.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Ban,
  ShieldCheck,
  Shield,
  ShieldOff,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users/$userId")({
  component: AdminUserDetail,
});

function brl(cents?: number | null) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const ROLES = ["admin", "moderator", "creator", "subscriber"] as const;
type Role = (typeof ROLES)[number];

function AdminUserDetail() {
  const { userId } = Route.useParams();
  const fetchDetail = useServerFn(getAdminUserDetail);
  const grantFn = useServerFn(grantRole);
  const revokeFn = useServerFn(revokeRole);
  const kycFn = useServerFn(setKycStatus);
  const banFn = useServerFn(banUser);
  const unbanFn = useServerFn(unbanUser);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => fetchDetail({ data: { userId } }),
    staleTime: 10_000,
  });

  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [rejReason, setRejReason] = useState("");
  const [rejOpen, setRejOpen] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function toggleRole(role: Role, has: boolean) {
    try {
      if (has) await revokeFn({ data: { userId, role } });
      else await grantFn({ data: { userId, role } });
      toast.success(has ? `Role ${role} removida` : `Role ${role} concedida`);
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  async function setKyc(status: "pending" | "verified" | "rejected", reason?: string) {
    try {
      await kycFn({ data: { userId, status, rejectionReason: reason } });
      toast.success(`KYC → ${status}`);
      setRejOpen(false);
      setRejReason("");
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  async function handleBan() {
    try {
      await banFn({ data: { userId, reason: banReason } });
      toast.success("Usuário banido");
      setBanOpen(false);
      setBanReason("");
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  async function handleUnban() {
    try {
      await unbanFn({ data: { userId } });
      toast.success("Banimento removido");
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  if (q.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (q.error || !q.data) {
    return <div className="text-destructive">Erro ao carregar usuário</div>;
  }

  const d = q.data;
  const p = d.profile as any;
  const hasRoles = new Set(d.roles.map((r) => r.role));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to="/admin/users"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Usuários
        </Link>
      </div>

      {/* Header */}
      <Card className="p-4 flex items-center gap-4">
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-muted" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold truncate">
              @{p.username}
            </h2>
            {p.banned_at && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                Banido
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
              {p.account_type}
            </span>
          </div>
          {p.display_name && (
            <div className="text-sm text-muted-foreground truncate">
              {p.display_name}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-0.5">
            id: {p.user_id}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            to="/$username"
            params={{ username: p.username }}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-center hover:bg-muted"
          >
            Ver perfil público
          </Link>
          {p.banned_at ? (
            <Button size="sm" variant="outline" onClick={handleUnban}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Desbanir
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => setBanOpen(true)}>
              <Ban className="h-4 w-4 mr-1" /> Banir
            </Button>
          )}
        </div>
      </Card>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Roles */}
        <Card className="p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Roles
          </h3>
          <div className="space-y-2">
            {ROLES.map((r) => {
              const has = hasRoles.has(r);
              return (
                <div
                  key={r}
                  className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2"
                >
                  <span className="font-medium capitalize">{r}</span>
                  <Button
                    size="sm"
                    variant={has ? "outline" : "default"}
                    onClick={() => toggleRole(r, has)}
                  >
                    {has ? (
                      <>
                        <ShieldOff className="h-3.5 w-3.5 mr-1" /> Revogar
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Conceder
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* KYC */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">KYC</h3>
          <div className="text-sm mb-3">
            Status atual:{" "}
            <span className="font-medium">{p.kyc_status ?? "—"}</span>
            {p.kyc_rejection_reason && (
              <div className="text-xs text-destructive mt-1">
                Motivo: {p.kyc_rejection_reason}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setKyc("pending")}>
              Pendente
            </Button>
            <Button size="sm" onClick={() => setKyc("verified")}>
              <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setRejOpen(true)}>
              <X className="h-3.5 w-3.5 mr-1" /> Reprovar
            </Button>
          </div>
        </Card>

        {/* Wallets */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">Carteiras</h3>
          <div className="space-y-1.5 text-sm">
            <Row
              label="Assinante — saldo"
              value={brl(d.wallets.subscriber?.balance_cents)}
            />
            <Row
              label="Criador — liberado"
              value={brl(d.wallets.creator?.released_cents)}
            />
            <Row
              label="Criador — a liberar (BR)"
              value={brl(d.wallets.creator?.pending_national_cents)}
            />
            <Row
              label="Criador — a liberar (Int)"
              value={brl(d.wallets.creator?.pending_international_cents)}
            />
          </div>
        </Card>

        {/* Contadores */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">Conteúdo</h3>
          <div className="space-y-1.5 text-sm">
            <Row label="Publicações" value={String(d.counts.publications)} />
            <Row label="Stories" value={String(d.counts.stories)} />
            <Row label="Lives" value={String(d.counts.lives)} />
            <Row label="Perfis vinculados" value={String(d.creatorProfiles.length)} />
            <Row label="Denúncias feitas" value={String(d.reportsMade.length)} />
          </div>
        </Card>
      </div>

      {/* Perfis vinculados */}
      {d.creatorProfiles.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Perfis vinculados</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {d.creatorProfiles.map((cp: any) => (
              <div
                key={cp.id}
                className="border border-border rounded-md px-3 py-2 flex items-center gap-2"
              >
                {cp.avatar_url ? (
                  <img
                    src={cp.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    @{cp.username}{" "}
                    <span className="text-xs text-muted-foreground">({cp.kind})</span>
                  </div>
                  {cp.price_monthly && (
                    <div className="text-xs text-muted-foreground">
                      R$ {Number(cp.price_monthly).toFixed(2)}/mês
                    </div>
                  )}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                  {cp.kyc_status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Transactions */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Últimas transações</h3>
        {d.transactions.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem transações.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left py-1.5">Data</th>
                  <th className="text-left">Tipo</th>
                  <th className="text-left">Método</th>
                  <th className="text-right">Bruto</th>
                  <th className="text-right">Líquido</th>
                  <th className="text-left">Papel</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.transactions.map((t: any) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-1.5 text-xs">
                      {new Date(t.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="text-xs">{t.kind}</td>
                    <td className="text-xs">{t.payment_method}</td>
                    <td className="text-right">{brl(t.amount_cents_gross)}</td>
                    <td className="text-right">{brl(t.net_cents)}</td>
                    <td className="text-xs">
                      {t.buyer_id === userId ? "comprador" : "criador"}
                    </td>
                    <td className="text-xs">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Subscriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SubsCard title="Assinaturas ativas (como assinante)" rows={d.subscriptionsAsSubscriber} otherLabel="Criador" />
        <SubsCard title="Assinantes deste criador" rows={d.subscriptionsAsCreator} otherLabel="Assinante" />
      </div>

      {/* Withdrawals */}
      {d.withdrawals.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Saques</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left py-1.5">Solicitado</th>
                  <th className="text-right">Bruto</th>
                  <th className="text-right">Líquido</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Processado</th>
                </tr>
              </thead>
              <tbody>
                {d.withdrawals.map((w: any) => (
                  <tr key={w.id} className="border-t border-border">
                    <td className="py-1.5 text-xs">
                      {new Date(w.requested_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="text-right">{brl(w.amount_cents)}</td>
                    <td className="text-right">{brl(w.net_cents)}</td>
                    <td className="text-xs">{w.status}</td>
                    <td className="text-xs">
                      {w.processed_at
                        ? new Date(w.processed_at).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Ban dialog */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banir @{p.username}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Descreva o motivo (registrado em log de auditoria):
          </p>
          <Textarea
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBan}
              disabled={banReason.trim().length < 3}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC reject dialog */}
      <Dialog open={rejOpen} onOpenChange={setRejOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar KYC</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejReason}
            onChange={(e) => setRejReason(e.target.value)}
            placeholder="Motivo da reprovação"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => setKyc("rejected", rejReason)}
              disabled={rejReason.trim().length < 3}
            >
              Reprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SubsCard({
  title,
  rows,
  otherLabel,
}: {
  title: string;
  rows: any[];
  otherLabel: string;
}) {
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-3">{title}</h3>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhuma.</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between text-sm border border-border rounded-md px-2.5 py-1.5"
            >
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{otherLabel}</span>
                <span className="text-xs font-mono">
                  {s.creator_id ?? s.subscriber_id}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs">
                  {s.plan} · {s.status}
                </div>
                <div className="text-xs text-muted-foreground">
                  até {new Date(s.current_period_end).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
