import { useMemo, useState } from "react";
import { createFileRoute, redirect, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Lock, Play, MessageCircle, Gift, Bookmark, RefreshCcw, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyBookmarks,
  listMyPurchases,
  listMyChatPurchases,
  listMyTipsSent,
} from "@/lib/collections.functions";
import {
  listMyRefundablePurchases,
  listMyRefundRequests,
  requestRefund,
  cancelRefundRequest,
  type RefundableItem,
  type RefundRequestItem,
} from "@/lib/refunds.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/colecoes")({
  head: () => ({
    meta: [
      { title: "Coleções · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: ColecoesPage,
});

type TabKey = "favoritos" | "compras" | "compras_chat" | "ocultados" | "mimos" | "reembolsos";

const TABS: { key: TabKey; label: string; empty: string }[] = [
  { key: "favoritos", label: "FAVORITOS", empty: "Você ainda não favoritou nenhum post." },
  { key: "compras", label: "MINHAS COMPRAS", empty: "Você ainda não comprou nenhum post." },
  { key: "compras_chat", label: "COMPRAS CHAT", empty: "Você ainda não comprou nada no chat." },
  { key: "ocultados", label: "OCULTADOS", empty: "Você não tem posts ocultos." },
  { key: "mimos", label: "MIMOS", empty: "Você ainda não enviou mimos." },
  { key: "reembolsos", label: "REEMBOLSOS", empty: "Você não tem solicitações de reembolso." },
];

function brl(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function CreatorLine({ creator }: { creator: { username: string | null; display_name: string | null; avatar_url: string | null } | null }) {
  const name = creator?.display_name || creator?.username || "Criador";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0">
        {creator?.avatar_url ? (
          <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        {creator?.username && (
          <div className="text-xs text-muted-foreground truncate">@{creator.username}</div>
        )}
      </div>
    </div>
  );
}

function PublicationRow({
  item,
  showAmount,
  onRefund,
}: {
  item: any;
  showAmount?: boolean;
  onRefund?: (item: RefundableItem) => void;
}) {
  const authorHref = item.author?.username
    ? `/perfil/${item.author.username}`
    : null;
  const pubHref = item.publication_id
    ? `/post/${item.publication_id}`
    : authorHref ?? "/colecoes";
  return (
    <Link
      to={pubHref}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors"
    >
      <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
        {item.thumb_url ? (
          <img src={item.thumb_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <Bookmark className="h-5 w-5" />
          </div>
        )}
        {item.media_type === "video" && (
          <div className="absolute inset-0 grid place-items-center bg-black/20">
            <Play className="h-5 w-5 text-white fill-white" />
          </div>
        )}
        {(item.visibility === "paid" || item.visibility === "challenge") && !item.thumb_url && (
          <div className="absolute inset-0 grid place-items-center">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <CreatorLine creator={item.author} />
        {item.caption && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.caption}</p>
        )}
        <div className="mt-1 text-[11px] text-muted-foreground">{formatDate(item.created_at)}</div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        {showAmount && item.amount_cents ? (
          <div className="text-sm font-semibold text-primary">{brl(item.amount_cents)}</div>
        ) : null}
        {onRefund && item.refundable !== false && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRefund(item as RefundableItem);
            }}
            className="text-[11px] font-medium text-destructive hover:underline"
          >
            Solicitar reembolso
          </button>
        )}
      </div>
    </Link>
  );
}

function ChatPurchaseRow({ item, onRefund }: { item: any; onRefund?: (item: RefundableItem) => void }) {
  return (
    <Link
      to={item.thread_id ? "/chat/$threadId" : "/colecoes"}
      params={item.thread_id ? { threadId: item.thread_id } : undefined as any}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors"
    >
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
        <MessageCircle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <CreatorLine creator={item.creator} />
        {item.message_preview && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.message_preview}</p>
        )}
        <div className="mt-1 text-[11px] text-muted-foreground">{formatDate(item.created_at)}</div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="text-sm font-semibold text-primary">{brl(item.amount_cents)}</div>
        {onRefund && item.refundable !== false && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRefund(item as RefundableItem);
            }}
            className="text-[11px] font-medium text-destructive hover:underline"
          >
            Solicitar reembolso
          </button>
        )}
      </div>
    </Link>
  );
}

function TipRow({ item }: { item: any }) {
  const href = item.creator?.username ? `/perfil/${item.creator.username}` : "/colecoes";
  return (
    <Link
      to={href}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors"
    >
      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
        <Gift className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <CreatorLine creator={item.creator} />
        {item.message && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">"{item.message}"</p>
        )}
        <div className="mt-1 text-[11px] text-muted-foreground">{formatDate(item.created_at)}</div>
      </div>
      <div className="text-sm font-semibold text-primary shrink-0">{brl(item.amount_cents)}</div>
    </Link>
  );
}

function RefundStatusBadge({ status }: { status: RefundRequestItem["status"] }) {
  const config: Record<
    RefundRequestItem["status"],
    { icon: React.ReactNode; label: string; className: string }
  > = {
    pending: {
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Pendente",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
    approved: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Aprovado",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    rejected: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Rejeitado",
      className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    },
    cancelled: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      label: "Cancelado",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function RefundRequestRow({
  item,
  onCancel,
  isCancelling,
}: {
  item: RefundRequestItem;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const thumb = item.details?.thumbUrl;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
      <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <RefreshCcw className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <RefundStatusBadge status={item.status} />
          <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
        </div>
        <p className="mt-1 text-sm font-medium line-clamp-1">
          {item.details?.caption || item.details?.messagePreview || "Reembolso solicitado"}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">{item.reason}</p>
        {item.adminNotes && (
          <p className="mt-1 text-[11px] text-muted-foreground italic">Nota: {item.adminNotes}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="text-sm font-semibold text-primary">{brl(item.amountCents)}</div>
        {item.status === "pending" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-destructive hover:text-destructive"
            onClick={() => onCancel(item.id)}
            disabled={isCancelling}
          >
            {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cancelar"}
          </Button>
        )}
      </div>
    </div>
  );
}

function RefundDialog({
  open,
  item,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  item: RefundableItem | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar reembolso</DialogTitle>
          <DialogDescription>
            Você está solicitando o reembolso de {item ? brl(item.amountCents) : ""}. Conte-nos o motivo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Textarea
            placeholder="Ex: conteúdo não corresponde ao anunciado, cobrança indevida..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            O prazo para reembolso é de até 7 dias após a compra. A solicitação será analisada pela equipe.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSubmit(reason)}
            disabled={isSubmitting || reason.trim().length < 5}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColecoesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<TabKey>("favoritos");
  const [refundItem, setRefundItem] = useState<RefundableItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const current = useMemo(() => TABS.find((t) => t.key === active)!, [active]);

  const bookmarksFn = useServerFn(listMyBookmarks);
  const purchasesFn = useServerFn(listMyPurchases);
  const chatPurchasesFn = useServerFn(listMyChatPurchases);
  const tipsFn = useServerFn(listMyTipsSent);
  const refundableFn = useServerFn(listMyRefundablePurchases);
  const refundRequestsFn = useServerFn(listMyRefundRequests);
  const requestRefundFn = useServerFn(requestRefund);
  const cancelRefundFn = useServerFn(cancelRefundRequest);

  const bookmarks = useQuery({
    queryKey: ["collections", "bookmarks"],
    queryFn: () => bookmarksFn(),
    enabled: active === "favoritos",
    staleTime: 30_000,
  });
  const purchases = useQuery({
    queryKey: ["collections", "purchases"],
    queryFn: () => purchasesFn(),
    enabled: active === "compras",
    staleTime: 30_000,
  });
  const chatPurchases = useQuery({
    queryKey: ["collections", "chat"],
    queryFn: () => chatPurchasesFn(),
    enabled: active === "compras_chat",
    staleTime: 30_000,
  });
  const tips = useQuery({
    queryKey: ["collections", "tips"],
    queryFn: () => tipsFn(),
    enabled: active === "mimos",
    staleTime: 30_000,
  });
  const refundable = useQuery({
    queryKey: ["refunds", "refundable"],
    queryFn: () => refundableFn(),
    enabled: active === "compras" || active === "compras_chat",
    staleTime: 30_000,
  });
  const refundRequests = useQuery({
    queryKey: ["refunds", "requests"],
    queryFn: () => refundRequestsFn(),
    enabled: active === "reembolsos",
    staleTime: 30_000,
  });

  const refundableIds = useMemo(
    () => new Set((refundable.data ?? []).map((r) => r.referenceId)),
    [refundable.data],
  );
  const refundableById = useMemo(() => {
    const m = new Map<string, RefundableItem>();
    (refundable.data ?? []).forEach((r) => m.set(r.referenceId, r));
    return m;
  }, [refundable.data]);

  async function handleRefundSubmit(reason: string) {
    if (!refundItem) return;
    setIsSubmitting(true);
    try {
      await requestRefundFn({
        data: {
          referenceType: refundItem.referenceType,
          referenceId: refundItem.referenceId,
          reason: reason.trim(),
        },
      });
      toast.success("Solicitação enviada", { description: "Seu pedido de reembolso foi registrado." });
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setRefundItem(null);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao solicitar reembolso. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel(requestId: string) {
    setIsCancelling(requestId);
    try {
      await cancelRefundFn({ data: { requestId } });
      toast.success("Solicitação cancelada");
      queryClient.invalidateQueries({ queryKey: ["refunds", "requests"] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao cancelar. Tente novamente.");
    } finally {
      setIsCancelling(null);
    }
  }

  function renderContent() {
    if (active === "ocultados") {
      return <EmptyState text={current.empty} />;
    }

    const q =
      active === "favoritos"
        ? bookmarks
        : active === "compras"
        ? purchases
        : active === "compras_chat"
        ? chatPurchases
        : active === "mimos"
        ? tips
        : active === "reembolsos"
        ? refundRequests
        : purchases;

    if (q.isLoading) {
      return (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (q.error) {
      return <p className="py-16 text-center text-sm text-destructive">Erro ao carregar.</p>;
    }
    const items = (q.data ?? []) as any[];
    if (items.length === 0) return <EmptyState text={current.empty} />;

    if (active === "reembolsos") {
      return (
        <ul className="space-y-2">
          {items.map((it: RefundRequestItem) => (
            <li key={it.id}>
              <RefundRequestRow
                item={it}
                onCancel={handleCancel}
                isCancelling={isCancelling === it.id}
              />
            </li>
          ))}
        </ul>
      );
    }

    return (
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id}>
            {active === "favoritos" && <PublicationRow item={it} />}
            {active === "compras" && (
              <PublicationRow
                item={{
                  ...it,
                  refundable: refundableIds.has(it.id),
                }}
                showAmount
                onRefund={refundableIds.has(it.id) ? setRefundItem : undefined}
              />
            )}
            {active === "compras_chat" && (
              <ChatPurchaseRow
                item={{
                  ...it,
                  refundable: refundableIds.has(it.id),
                }}
                onRefund={refundableIds.has(it.id) ? setRefundItem : undefined}
              />
            )}
            {active === "mimos" && <TipRow item={it} />}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-white dark:bg-background">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-slate-900 dark:text-foreground truncate">Coleções</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex items-center gap-2 md:gap-3 justify-start md:justify-center whitespace-nowrap pb-2">
            {TABS.map((tab) => {
              const isActive = tab.key === active;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActive(tab.key)}
                  className={`px-4 py-2 rounded-md text-xs font-bold tracking-wide transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">{renderContent()}</div>
      </main>

      <RefundDialog
        open={!!refundItem}
        item={refundItem}
        onClose={() => setRefundItem(null)}
        onSubmit={handleRefundSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-10 grid place-items-center px-4 text-center">
      <p className="text-base md:text-lg font-medium text-foreground">{text}</p>
    </div>
  );
}
