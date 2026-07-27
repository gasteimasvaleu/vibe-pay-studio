import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listContactMessages,
  replyContactMessage,
  updateContactStatus,
  CONTACT_REASONS,
} from "@/lib/contact.functions";
import { AdminTablePage, PillFilters } from "@/components/admin/AdminShared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/contacts")({
  component: () => <AdminContacts />,
});

const STATUS_FILTERS = [
  { v: "", l: "Todas" },
  { v: "open", l: "Abertas" },
  { v: "in_progress", l: "Em andamento" },
  { v: "answered", l: "Respondidas" },
  { v: "closed", l: "Fechadas" },
];

const STATUS_BADGE: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  answered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  in_progress: "Em andamento",
  answered: "Respondida",
  closed: "Fechada",
};

function AdminContacts() {
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const listFn = useServerFn(listContactMessages);
  const replyFn = useServerFn(replyContactMessage);
  const statusFn = useServerFn(updateContactStatus);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-contacts", status, reason, search],
    queryFn: () =>
      listFn({
        data: {
          status: status || undefined,
          reason: reason || undefined,
          search: search || undefined,
        },
      }),
    staleTime: 10_000,
  });

  function openRow(row: any) {
    setSelected(row);
    setReply(row.admin_reply ?? "");
  }

  async function onSendReply() {
    if (!selected || reply.trim().length < 3) return;
    setSaving(true);
    try {
      const res: any = await replyFn({ data: { id: selected.id, reply: reply.trim() } });
      if (res?.email?.sent) toast.success("Resposta enviada por e-mail.");
      else
        toast.success(
          "Resposta salva. E-mail não enviado (Resend não configurado ou falhou).",
        );
      qc.invalidateQueries({ queryKey: ["admin-contacts"] });
      setSelected(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao responder");
    } finally {
      setSaving(false);
    }
  }

  async function onSetStatus(s: "open" | "in_progress" | "answered" | "closed") {
    if (!selected) return;
    try {
      await statusFn({ data: { id: selected.id, status: s } });
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin-contacts"] });
      setSelected(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    }
  }

  const rows = q.data ?? [];

  return (
    <AdminTablePage
      loading={q.isLoading}
      empty={rows.length === 0}
      filters={
        <div className="space-y-3">
          <PillFilters value={status} onChange={setStatus} options={STATUS_FILTERS} />
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Buscar por nome, e-mail ou mensagem…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm h-9"
            />
            <Select value={reason || "__all"} onValueChange={(v) => setReason(v === "__all" ? "" : v)}>
              <SelectTrigger className="w-64 h-9">
                <SelectValue placeholder="Todos os motivos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos os motivos</SelectItem>
                {CONTACT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
      headers={["Data", "Remetente", "Motivo", "Mensagem", "Status", "Ação"]}
      rows={rows.map((r: any) => [
        <span className="text-xs whitespace-nowrap">
          {new Date(r.created_at).toLocaleString("pt-BR")}
        </span>,
        <div className="text-xs">
          <div className="font-medium">{r.name}</div>
          <div className="text-muted-foreground">{r.email}</div>
        </div>,
        <span className="text-xs">{r.reason}</span>,
        <span className="text-xs text-muted-foreground line-clamp-2 max-w-md block">
          {r.message}
        </span>,
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] ?? ""}`}
        >
          {STATUS_LABEL[r.status] ?? r.status}
        </span>,
        <button
          className="text-xs text-primary hover:underline"
          onClick={() => openRow(r)}
        >
          Abrir
        </button>,
      ])}
      dialog={
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Mensagem de contato</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Meta k="Nome" v={selected.name} />
                  <Meta k="E-mail" v={selected.email} />
                  <Meta k="Motivo" v={selected.reason} />
                  <Meta
                    k="Recebida em"
                    v={new Date(selected.created_at).toLocaleString("pt-BR")}
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Mensagem</div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap text-sm">
                    {selected.message}
                  </div>
                </div>
                {selected.admin_reply && selected.status === "answered" && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Resposta enviada em{" "}
                      {selected.answered_at
                        ? new Date(selected.answered_at).toLocaleString("pt-BR")
                        : ""}
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 whitespace-pre-wrap text-sm">
                      {selected.admin_reply}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {selected.status === "answered" ? "Nova resposta" : "Resposta"}
                  </div>
                  <Textarea
                    rows={6}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Escreva a resposta que será enviada por e-mail ao remetente…"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
              <div className="flex gap-2">
                {selected?.status !== "closed" && (
                  <Button variant="outline" size="sm" onClick={() => onSetStatus("closed")}>
                    Fechar sem resposta
                  </Button>
                )}
                {selected?.status === "open" && (
                  <Button variant="outline" size="sm" onClick={() => onSetStatus("in_progress")}>
                    Marcar em andamento
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Cancelar
                </Button>
                <Button
                  disabled={reply.trim().length < 3 || saving}
                  onClick={onSendReply}
                >
                  {saving ? "Enviando…" : "Enviar resposta"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{k}</div>
      <div className="font-medium break-all">{v}</div>
    </div>
  );
}
