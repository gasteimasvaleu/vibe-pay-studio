import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { deletePromotion, endPromotion, listMyPromotions } from "@/lib/promotions.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const promotionsQueryOptions = queryOptions({
  queryKey: ["my-promotions"],
  queryFn: () => listMyPromotions(),
});

export const Route = createFileRoute("/_authenticated/promotions")({
  head: () => ({
    meta: [
      { title: "Ofertas · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(promotionsQueryOptions);
    if (!data || data.length === 0) {
      throw redirect({ to: "/promotion" });
    }
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-foreground grid place-items-center p-6">
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: PromotionsListPage,
});

type Tab = "active" | "inactive";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function PromotionsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: promotions } = useSuspenseQuery(promotionsQueryOptions);
  const endPromotionFn = useServerFn(endPromotion);
  const deletePromotionFn = useServerFn(deletePromotion);

  const hasActive = promotions.some((p) => p.is_active);
  const [tab, setTab] = useState<Tab>(hasActive ? "active" : "inactive");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = promotions.filter((p) => (tab === "active" ? p.is_active : !p.is_active));

  const endMutation = useMutation({
    mutationFn: (id: string) => endPromotionFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Oferta encerrada");
      queryClient.invalidateQueries({ queryKey: ["my-promotions"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao encerrar oferta");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePromotionFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Oferta apagada");
      queryClient.invalidateQueries({ queryKey: ["my-promotions"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao apagar oferta");
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="mx-auto max-w-2xl px-5 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            aria-label="Voltar"
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold text-foreground truncate">Ofertas</h1>
          <span className="h-9 w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        <div className="grid grid-cols-2 border-b border-border mb-6">
          {(["active", "inactive"] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`py-3 text-center text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  active
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {t === "active" ? "Ativas" : "Inativas"}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-16 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {tab === "active" ? "Nenhuma oferta ativa no momento." : "Nenhuma oferta inativa."}
            </p>
            {tab === "active" && (
              <button
                onClick={() => navigate({ to: "/promotion" })}
                className="px-6 py-3 rounded-md bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition"
              >
                Criar nova oferta
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => (
              <PromotionCard
                key={p.id}
                promotion={p}
                onEnd={() => endMutation.mutate(p.id)}
                ending={endMutation.isPending && endMutation.variables === p.id}
                onDelete={() => setConfirmDeleteId(p.id)}
                deleting={deleteMutation.isPending && deleteMutation.variables === p.id}
              />
            ))}
            {tab === "active" && (
              <button
                onClick={() => navigate({ to: "/promotion" })}
                className="w-full py-3.5 rounded-md border border-border bg-background text-foreground font-semibold hover:bg-muted transition"
              >
                Criar nova oferta
              </button>
            )}
          </div>
        )}
      </main>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar oferta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type PromotionRow = Awaited<ReturnType<typeof listMyPromotions>>[number];

function PromotionCard({
  promotion,
  onEnd,
  ending,
  onDelete,
  deleting,
}: {
  promotion: PromotionRow;
  onEnd: () => void;
  ending: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const active = promotion.is_active;
  const monthly = Number(promotion.monthly_price_snapshot);
  const promo = Number(promotion.promo_price);
  const days = daysUntil(promotion.ends_at);

  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-card-foreground truncate">{promotion.name}</h3>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                active ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            <span className="text-sm text-foreground">
              {active ? "Oferta ativa" : "Oferta encerrada"}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {active
              ? `Termina em ${days} ${days === 1 ? "dia" : "dias"} (${formatDate(promotion.ends_at)})`
              : `Encerrada em ${formatDate(promotion.ends_at)}`}
          </p>
        </div>
        <span className="text-muted-foreground shrink-0 mt-1">
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 rounded-2xl bg-muted p-4 space-y-2 text-sm">
          <Row label="Valor original" value={`R$${formatBRL(monthly)}`} />
          <Row
            label="Desconto"
            value={`-${promotion.discount_pct}%`}
            valueClassName="text-primary font-semibold"
          />
          <Row label="Valor final" value={`R$${formatBRL(promo)}`} valueClassName="font-bold" />
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-3 text-sm">
          <Row label="Oferta:" value="Desconto na assinatura" />
          <Row label="Início da campanha:" value={formatDate(promotion.starts_at)} />
          <Row label="Fim da campanha:" value={formatDate(promotion.ends_at)} />
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Quantidade de participantes:</span>
        <span className="text-sm text-foreground">
          {promotion.subscriptions_used}/{promotion.max_subscriptions}
        </span>
      </div>

      {active ? (
        <button
          type="button"
          onClick={onEnd}
          disabled={ending}
          className="mt-4 w-full py-3 rounded-md border border-border bg-background text-foreground font-semibold hover:bg-muted transition disabled:opacity-50"
        >
          {ending ? "Encerrando..." : "Encerrar oferta"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="mt-4 w-full py-3 rounded-md border border-destructive/40 bg-background text-destructive font-semibold hover:bg-destructive/10 transition disabled:opacity-50"
        >
          {deleting ? "Apagando..." : "Apagar oferta"}
        </button>
      )}
    </article>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-foreground font-semibold">{label}</span>
      <span className={`text-foreground ${valueClassName ?? ""}`}>{value}</span>
    </div>
  );
}
