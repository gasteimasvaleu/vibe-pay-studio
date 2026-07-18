import { useMemo, useState } from "react";
import { createFileRoute, redirect, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Lock, Play, MessageCircle, Gift, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyBookmarks,
  listMyPurchases,
  listMyChatPurchases,
  listMyTipsSent,
} from "@/lib/collections.functions";

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

type TabKey = "favoritos" | "compras" | "compras_chat" | "ocultados" | "mimos";

const TABS: { key: TabKey; label: string; empty: string }[] = [
  { key: "favoritos", label: "FAVORITOS", empty: "Você ainda não favoritou nenhum post." },
  { key: "compras", label: "MINHAS COMPRAS", empty: "Você ainda não comprou nenhum post." },
  { key: "compras_chat", label: "COMPRAS CHAT", empty: "Você ainda não comprou nada no chat." },
  { key: "ocultados", label: "OCULTADOS", empty: "Você não tem posts ocultos." },
  { key: "mimos", label: "MIMOS", empty: "Você ainda não enviou mimos." },
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
}: {
  item: any;
  showAmount?: boolean;
}) {
  const authorHref = item.author?.username
    ? `/perfil/${item.author.username}`
    : null;
  return (
    <Link
      to={authorHref ?? "/colecoes"}
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
      {showAmount && item.amount_cents ? (
        <div className="text-sm font-semibold text-primary shrink-0">
          {brl(item.amount_cents)}
        </div>
      ) : null}
    </Link>
  );
}

function ChatPurchaseRow({ item }: { item: any }) {
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
      <div className="text-sm font-semibold text-primary shrink-0">{brl(item.amount_cents)}</div>
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

function ColecoesPage() {
  const router = useRouter();
  const [active, setActive] = useState<TabKey>("favoritos");
  const current = useMemo(() => TABS.find((t) => t.key === active)!, [active]);

  const bookmarksFn = useServerFn(listMyBookmarks);
  const purchasesFn = useServerFn(listMyPurchases);
  const chatPurchasesFn = useServerFn(listMyChatPurchases);
  const tipsFn = useServerFn(listMyTipsSent);

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
        : tips;

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

    return (
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id}>
            {active === "favoritos" && <PublicationRow item={it} />}
            {active === "compras" && <PublicationRow item={it} showAmount />}
            {active === "compras_chat" && <ChatPurchaseRow item={it} />}
            {active === "mimos" && <TipRow item={it} />}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-slate-900 truncate">Coleções</h1>
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
