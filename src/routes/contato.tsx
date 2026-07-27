import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/site/Layout";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, User, AtSign, MessageSquare, ListChecks } from "lucide-react";
import { submitContact, CONTACT_REASONS } from "@/lib/contact.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato · Monetisexy" },
      {
        name: "description",
        content:
          "Fale com a equipe Monetisexy. Envie dúvidas sobre pagamentos, acesso, denúncias e parcerias.",
      },
      { property: "og:title", content: "Contato · Monetisexy" },
      {
        property: "og:description",
        content: "Fale com a equipe Monetisexy: pagamentos, acesso, denúncias e parcerias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const submit = useServerFn(submitContact);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const valid =
    name.trim().length > 0 &&
    /.+@.+\..+/.test(email.trim()) &&
    reason.length > 0 &&
    message.trim().length >= 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    try {
      await submit({
        data: {
          name: name.trim(),
          email: email.trim(),
          reason: reason as (typeof CONTACT_REASONS)[number],
          message: message.trim(),
        },
      });
      toast.success("Mensagem enviada! Responderemos em até 48h.");
      setName("");
      setEmail("");
      setReason("");
      setMessage("");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-foreground">
        <header className="mb-10 pb-10 border-b border-border">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Entre em contato
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Preencha o formulário abaixo. Responderemos em até 48h úteis.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-5">
            <FieldShell label="NOME">
              <User className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="Insira seu nome"
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/70"
                required
              />
            </FieldShell>

            <FieldShell label="EMAIL">
              <AtSign className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                placeholder="Insira seu e-mail"
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/70"
                required
              />
            </FieldShell>

            <FieldShell label="* MOTIVO">
              <ListChecks className="h-5 w-5 text-muted-foreground shrink-0" />
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="flex-1 border-0 shadow-none h-auto p-0 focus:ring-0 focus:ring-offset-0 bg-transparent">
                  <SelectValue placeholder="Selecionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldShell>

            <div className="rounded-3xl border border-border bg-card px-6 py-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <label className="text-xs font-semibold tracking-wider text-foreground/80">
                  INSIRA SUA MENSAGEM
                </label>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={6}
                className="w-full bg-transparent outline-none resize-none text-foreground placeholder:text-muted-foreground/60"
                placeholder="Descreva sua dúvida com detalhes (mínimo 10 caracteres)"
                required
              />
              <div className="flex justify-end text-[11px] text-muted-foreground">
                {message.length}/2000
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Button
                type="submit"
                disabled={!valid || loading}
                className="rounded-full px-16 h-11 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
              >
                {loading ? "Enviando…" : "Enviar"}
              </Button>
            </div>
          </form>

          <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground space-y-2">
            <p>
              Monetisexy — Plataforma de creator economy. Suporte disponível em português, com resposta
              em até 48 horas úteis.
            </p>
            <p>
              Informações adicionais sobre solicitações de aplicação da lei podem ser encontradas em
              nosso{" "}
              <Link to="/centro-e-seguranca" className="text-primary hover:underline">
                Centro de Segurança
              </Link>
              .
            </p>
          </div>
        </article>
      </SiteLayout>
  );
}

function FieldShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-full border border-border bg-card px-6 py-3">
      <div className="text-[11px] font-semibold tracking-wider text-foreground/80 mb-0.5">
        {label}
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
