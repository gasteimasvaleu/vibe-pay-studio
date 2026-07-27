import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DollarSign, Trophy, Shield, HelpCircle } from "lucide-react";
import { getCreatorHubHighlights, requestTrophy } from "@/lib/creator-hub.functions";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Como funciona o saque?",
    a: "Saques podem ser solicitados a partir de R$ 50,00, cai por PIX em até 1 dia útil. O primeiro saque tem verificação anti-fraude que pode levar mais tempo.",
  },
  {
    q: "Como funcionam os planos de assinatura?",
    a: "Você define o valor mensal e descontos opcionais para 3 e 6 meses. As assinaturas são renovadas automaticamente via Asaas até o assinante cancelar.",
  },
  {
    q: "Se meu post for moderado, o que faço?",
    a: "Você tem 7 dias pra contestar. Abra o item em Destaques → Moderação, revise o motivo e envie sua contestação — nosso time revisa em até 48h.",
  },
  {
    q: "Como pego meu troféu físico?",
    a: "Ao atingir R$ 100k, R$ 500k ou R$ 1M de faturamento, o botão Solicitar troféu fica ativo em Conquistas. Enviamos pra endereço cadastrado nas suas configurações.",
  },
];

export function DestaquesPanel() {
  const fn = useServerFn(getCreatorHubHighlights);
  const q = useQuery({
    queryKey: ["creator-hub-highlights"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
  const qc = useQueryClient();
  const reqFn = useServerFn(requestTrophy);
  const reqMut = useMutation({
    mutationFn: (milestoneCents: number) => reqFn({ data: { milestoneCents } }),
    onSuccess: () => {
      toast.success("Solicitação enviada!");
      qc.invalidateQueries({ queryKey: ["creator-hub-highlights"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const h = q.data;
  const moderationCount = h?.moderation.count ?? 0;

  return (
    <Accordion type="multiple" className="space-y-3">
      <AccordionItem
        value="sales"
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <AccordionTrigger className="px-4 py-4 text-base font-bold hover:no-underline">
          <span className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary" />
            Vendas
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Faturamento 7d" value={brl(h?.sales.revenue7dCents ?? 0)} />
              <Metric
                label="Novas assinantes 7d"
                value={String(h?.sales.newSubscribers7d ?? 0)}
              />
              <Metric
                label="Mídia mais vendida"
                value={
                  h?.sales.topMediaSalesCount
                    ? `${h.sales.topMediaSalesCount} venda(s)`
                    : "—"
                }
                sub={h?.sales.topMediaTitle ?? undefined}
              />
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="achievements"
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <AccordionTrigger className="px-4 py-4 text-base font-bold hover:no-underline">
          <span className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary" />
            Conquistas
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Faturamento total: <strong>{brl(h?.achievements.totalEarnedCents ?? 0)}</strong>
          </p>
          {(h?.achievements.milestones ?? []).map((m) => {
            const pct = Math.min(
              100,
              Math.round(((h?.achievements.totalEarnedCents ?? 0) / m.cents) * 100),
            );
            return (
              <div key={m.cents} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{brl(m.cents)}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant={m.requested ? "outline" : "default"}
                    disabled={!m.reached || m.requested || reqMut.isPending}
                    onClick={() => reqMut.mutate(m.cents)}
                    className="rounded-full"
                  >
                    {m.requested ? "Solicitado" : "Solicitar troféu"}
                  </Button>
                </div>
              </div>
            );
          })}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="moderation"
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <AccordionTrigger className="px-4 py-4 text-base font-bold hover:no-underline">
          <span className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            Moderação
            {moderationCount > 0 && (
              <span className="ml-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {moderationCount}
              </span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {moderationCount === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma moderação recente.</p>
          ) : (
            <ul className="space-y-2">
              {h?.moderation.items.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize">{m.status}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-muted-foreground">
                    {m.caption ?? "(sem legenda)"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="faq"
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <AccordionTrigger className="px-4 py-4 text-base font-bold hover:no-underline">
          <span className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-primary" />
            Perguntas frequentes
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border px-3">
                <AccordionTrigger className="text-sm hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
