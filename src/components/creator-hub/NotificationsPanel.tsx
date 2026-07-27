import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getCreatorHubNotificationsV2,
  type CreatorHubFilter,
  type CreatorHubNotification,
} from "@/lib/creator-hub.functions";
import { ShoppingBag, Gift, MessageCircle, Heart } from "lucide-react";

const FILTERS: Array<{ key: CreatorHubFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "sales", label: "Vendas" },
  { key: "tips", label: "Mimos" },
  { key: "comments", label: "Comentários" },
  { key: "feed", label: "Feed" },
];

function formatBrl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function KindIcon({ kind }: { kind: CreatorHubNotification["kind"] }) {
  const cls = "h-4 w-4";
  if (kind === "sale") return <ShoppingBag className={cls} />;
  if (kind === "tip") return <Gift className={cls} />;
  if (kind === "comment") return <MessageCircle className={cls} />;
  return <Heart className={cls} />;
}

export function NotificationsPanel() {
  const [filter, setFilter] = useState<CreatorHubFilter>("all");
  const fn = useServerFn(getCreatorHubNotificationsV2);
  const q = useQuery({
    queryKey: ["creator-hub-notifications", filter],
    queryFn: () => fn({ data: { filter } }),
    staleTime: 30_000,
  });

  const items = q.data ?? [];

  return (
    <div className="space-y-5">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex gap-2">
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  active
                    ? "border-transparent bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground/80 hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {q.isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-base text-muted-foreground">Sem notificações.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {items.map((n) => (
            <li key={n.id} className="flex items-center gap-3 px-4 py-3">
              <div className="relative h-10 w-10 shrink-0">
                {n.actorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={n.actorAvatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-xs font-bold text-foreground/60">
                    {(n.actorUsername ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                  <KindIcon kind={n.kind} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {n.actorUsername ? `@${n.actorUsername} · ` : ""}
                  {n.title}
                </p>
                {n.subtitle && (
                  <p className="truncate text-xs text-muted-foreground">{n.subtitle}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
              {n.amountCents != null && (
                <span className="shrink-0 text-sm font-bold text-primary">
                  {formatBrl(n.amountCents)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
