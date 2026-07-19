import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Save, RotateCcw, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  listEmailTemplates,
  updateEmailTemplate,
  resetEmailTemplate,
  sendEmailTemplatePreview,
  type AdminEmailTemplate,
} from "@/lib/admin-email-templates.functions";
import {
  EMAIL_KINDS,
  EMAIL_KIND_LABELS,
  EMAIL_KIND_DESCRIPTIONS,
  AVAILABLE_VARS,
  SAMPLE_VARS,
  fillTemplate,
  shellHtml,
  type EmailKind,
} from "@/lib/email-templates.meta";

export const Route = createFileRoute("/_authenticated/admin/emails")({
  head: () => ({
    meta: [
      { title: "Admin · E-mails · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminEmailsPage,
});

function AdminEmailsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listEmailTemplates);
  const update = useServerFn(updateEmailTemplate);
  const reset = useServerFn(resetEmailTemplate);
  const sendTest = useServerFn(sendEmailTemplatePreview);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "email-templates"],
    queryFn: () => list(),
    staleTime: 30_000,
  });

  const [selected, setSelected] = useState<EmailKind>("post_sales");
  const [drafts, setDrafts] = useState<
    Partial<Record<EmailKind, { subject: string; body_html: string }>>
  >({});
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const byKind = useMemo(() => {
    const m = new Map<EmailKind, AdminEmailTemplate>();
    (data ?? []).forEach((t) => m.set(t.kind, t));
    return m;
  }, [data]);

  const current = byKind.get(selected);
  const draft = drafts[selected];
  const subject = draft?.subject ?? current?.subject ?? "";
  const body = draft?.body_html ?? current?.body_html ?? "";
  const dirty =
    !!draft &&
    (draft.subject !== current?.subject || draft.body_html !== current?.body_html);

  function setDraft(next: Partial<{ subject: string; body_html: string }>) {
    setDrafts((d) => ({
      ...d,
      [selected]: {
        subject: next.subject ?? subject,
        body_html: next.body_html ?? body,
      },
    }));
  }

  function insertVar(v: string) {
    const el = document.getElementById("body_html") as HTMLTextAreaElement | null;
    const token = `{{${v}}}`;
    if (!el) {
      setDraft({ body_html: body + token });
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setDraft({ body_html: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const previewHtml = useMemo(() => {
    const filled = fillTemplate(body, SAMPLE_VARS[selected]);
    return shellHtml(filled);
  }, [body, selected]);
  const previewSubject = fillTemplate(subject, SAMPLE_VARS[selected]);

  async function onSave() {
    if (!dirty) return;
    setSaving(true);
    try {
      await update({
        data: { kind: selected, subject, body_html: body },
      });
      toast.success("Template salvo");
      setDrafts((d) => {
        const n = { ...d };
        delete n[selected];
        return n;
      });
      await qc.invalidateQueries({ queryKey: ["admin", "email-templates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function onReset() {
    if (!confirm("Restaurar o texto padrão deste e-mail?")) return;
    setSaving(true);
    try {
      await reset({ data: { kind: selected } });
      toast.success("Template restaurado");
      setDrafts((d) => {
        const n = { ...d };
        delete n[selected];
        return n;
      });
      await qc.invalidateQueries({ queryKey: ["admin", "email-templates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao restaurar");
    } finally {
      setSaving(false);
    }
  }

  async function onSendTest() {
    if (!testEmail || sending) return;
    setSending(true);
    try {
      const res = await sendTest({ data: { kind: selected, to: testEmail } });
      if (res.ok) toast.success(`E-mail de teste enviado para ${testEmail}`);
      else toast.error(res.error || "Falha no envio");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Templates de e-mail</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Falha ao carregar."}
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <aside className="space-y-1">
            {EMAIL_KINDS.map((k) => {
              const t = byKind.get(k);
              const isActive = selected === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelected(k)}
                  className={
                    "w-full text-left px-3 py-2 rounded-lg border transition-colors " +
                    (isActive
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border hover:bg-accent text-foreground")
                  }
                >
                  <div className="text-sm font-semibold">
                    {EMAIL_KIND_LABELS[k]}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {EMAIL_KIND_DESCRIPTIONS[k]}
                  </div>
                  {t?.updated_at && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Atualizado {new Date(t.updated_at).toLocaleString("pt-BR")}
                    </div>
                  )}
                </button>
              );
            })}
          </aside>

          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">
                    {EMAIL_KIND_LABELS[selected]}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {EMAIL_KIND_DESCRIPTIONS[selected]}
                  </p>
                </div>
                {dirty && <Badge variant="secondary">Não salvo</Badge>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setDraft({ subject: e.target.value })}
                  maxLength={300}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="body_html">Corpo do e-mail (HTML)</Label>
                  <span className="text-xs text-muted-foreground">
                    Use {"{{variavel}}"} para inserir dados
                  </span>
                </div>
                <Textarea
                  id="body_html"
                  value={body}
                  onChange={(e) => setDraft({ body_html: e.target.value })}
                  className="font-mono text-xs min-h-[280px]"
                  maxLength={50_000}
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {AVAILABLE_VARS[selected].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVar(v)}
                      className="px-2 py-1 text-xs rounded-md border border-border bg-accent/40 hover:bg-accent font-mono text-foreground"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button onClick={onSave} disabled={!dirty || saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
                <Button variant="outline" onClick={onReset} disabled={saving}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Restaurar padrão
                </Button>
                <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="email"
                    placeholder="teste@dominio.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full sm:w-64"
                  />
                  <Button
                    variant="secondary"
                    onClick={onSendTest}
                    disabled={!testEmail || sending}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar teste
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Pré-visualização (valores de exemplo)
                </p>
                <p className="text-sm font-semibold mt-0.5 truncate">
                  {previewSubject || "—"}
                </p>
              </div>
              <iframe
                title="preview"
                sandbox=""
                srcDoc={previewHtml}
                className="w-full h-[520px] bg-white"
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
