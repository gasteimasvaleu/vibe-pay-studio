import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarCheck,
  ListFilter,
  MessageCircle,
  Plus,
  Search,
  Settings,
  UserRoundCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listThreads,
  openThreadWith,
  searchUsers,
  type PartnerProfile,
  type ThreadListItem,
} from "@/lib/chat.functions";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AppTopBar } from "@/components/site/AppTopBar";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatLayout,
});

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function ChatLayout() {
  const listThreadsFn = useServerFn(listThreads);
  const queryClient = useQueryClient();
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [openNewChat, setOpenNewChat] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  const [filters, setFilters] = useState<ChatFilters>({
    unread: false,
    interactions: false,
    favorites: false,
    muted: false,
    topBuyers: false,
    sort: "recent",
  });
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [meId, setMeId] = useState<string | null>(null);

  const params = useParams({ strict: false }) as { threadId?: string };
  const activeThreadId = params.threadId;

  const { data: threads = [] } = useQuery({
    queryKey: ["chat", "threads"],
    queryFn: () => listThreadsFn(),
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("chat-threads-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
          if (activeThreadId) {
            queryClient.invalidateQueries({
              queryKey: ["chat", "messages", activeThreadId],
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_threads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, activeThreadId]);

  useEffect(() => {
    if (!meId) return;
    const channel = supabase.channel("online-users", {
      config: { presence: { key: meId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId]);

  const filteredThreads = useMemo(() => {
    if (!onlineOnly) return threads;
    return threads.filter((t) => onlineUsers.has(t.partnerId));
  }, [threads, onlineOnly, onlineUsers]);

  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <AppTopBar />
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[340px_1fr] min-h-[calc(100svh-61px)]">
        <aside
          className={cn(
            "border-r border-border bg-card/80 backdrop-blur-xl",
            activeThreadId ? "hidden md:flex" : "flex",
            "flex-col",
          )}
        >
          <div className="px-4 pt-6 pb-3 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Conversas</h1>
            <div className="flex items-center gap-1 text-muted-foreground">
              <IconBtn onClick={() => setOpenNewChat(true)} label="Nova conversa">
                <Plus className="h-5 w-5" />
              </IconBtn>
              <IconBtn label="Agenda">
                <CalendarCheck className="h-5 w-5" />
              </IconBtn>
              <IconBtn label="Configurações">
                <Settings className="h-5 w-5" />
              </IconBtn>
              <IconBtn label="Filtros" onClick={() => setOpenFilters(true)}>
                <ListFilter className="h-5 w-5" />
              </IconBtn>
              <Link
                to="/account-status"
                aria-label="Presença"
                className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <UserRoundCheck className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                readOnly
                onClick={() => setOpenNewChat(true)}
                placeholder="Pesquisar usuários"
                className="pl-9 cursor-pointer"
              />
            </div>
          </div>

          <div className="px-4 py-4 flex items-center justify-between">
            <span className="text-sm text-foreground">Exibir apenas usuários online</span>
            <Switch checked={onlineOnly} onCheckedChange={setOnlineOnly} />
          </div>

          <div className="border-t border-border" />

          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground italic">Sem conversas</div>
            ) : (
              <ul>
                {filteredThreads.map((t) => (
                  <ThreadRow
                    key={t.threadId}
                    thread={t}
                    active={t.threadId === activeThreadId}
                    online={onlineUsers.has(t.partnerId)}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className={cn(activeThreadId ? "flex" : "hidden md:flex", "flex-col min-h-[calc(100svh-61px)]")}>
          <Outlet />
        </section>
      </div>

      <NewChatDialog open={openNewChat} onOpenChange={setOpenNewChat} />
      <FiltersSheet
        open={openFilters}
        onOpenChange={setOpenFilters}
        filters={filters}
        onChange={setFilters}
      />
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}

function ThreadRow({
  thread,
  active,
  online,
}: {
  thread: ThreadListItem;
  active: boolean;
  online: boolean;
}) {
  return (
    <li>
      <Link
        to="/chat/$threadId"
        params={{ threadId: thread.threadId }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 border-b border-border transition-colors",
          active ? "bg-accent" : "hover:bg-muted",
        )}
      >
        <div className="relative">
          <div className="h-11 w-11 rounded-full bg-gradient-primary grid place-items-center text-sm font-semibold text-primary-foreground">
            {initials(thread.partnerUsername)}
          </div>
          {online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-foreground">@{thread.partnerUsername}</span>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {formatTime(thread.lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm text-muted-foreground">
              {thread.lastMessage ?? "Sem mensagens"}
            </span>
            {thread.unreadCount > 0 && (
              <span className="shrink-0 min-w-5 h-5 px-1.5 grid place-items-center text-[11px] rounded-full bg-gradient-primary text-primary-foreground font-semibold">
                {thread.unreadCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

function NewChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const searchFn = useServerFn(searchUsers);
  const openFn = useServerFn(openThreadWith);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<PartnerProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchFn({ data: { query: q.trim() } });
        setResults(rows);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [q, searchFn]);

  const openMutation = useMutation({
    mutationFn: (userId: string) => openFn({ data: { userId } }),
    onSuccess: async ({ threadId }) => {
      await queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
      onOpenChange(false);
      navigate({ to: "/chat/$threadId", params: { threadId } });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por @username"
            className="pl-9"
          />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-2">
          {loading && <div className="p-4 text-sm text-muted-foreground">Buscando…</div>}
          {!loading && q.trim() && results.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Nenhum usuário encontrado</div>
          )}
          {results.map((u) => (
            <button
              key={u.userId}
              type="button"
              disabled={openMutation.isPending}
              onClick={() => openMutation.mutate(u.userId)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-xs font-semibold text-primary-foreground">
                {initials(u.username)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium text-foreground">@{u.username}</div>
              </div>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ChatFilters = {
  unread: boolean;
  interactions: boolean;
  favorites: boolean;
  muted: boolean;
  topBuyers: boolean;
  sort: "recent" | "oldest";
};

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-gradient-primary text-primary-foreground shadow-glow"
          : "bg-muted text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function FiltersSheet({
  open,
  onOpenChange,
  filters,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filters: ChatFilters;
  onChange: (f: ChatFilters) => void;
}) {
  const toggle = <K extends keyof ChatFilters>(key: K) =>
    onChange({ ...filters, [key]: !filters[key] } as ChatFilters);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl sm:max-w-[420px] sm:mx-auto sm:left-0 sm:right-0"
      >
        <SheetHeader>
          <SheetTitle>Filtrar por</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Conversas</h3>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={filters.unread} onClick={() => toggle("unread")}>
                Não lidas
              </FilterChip>
              <FilterChip active={filters.interactions} onClick={() => toggle("interactions")}>
                Interações
              </FilterChip>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Usuários</h3>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={filters.favorites} onClick={() => toggle("favorites")}>
                Favoritos
              </FilterChip>
              <FilterChip active={filters.muted} onClick={() => toggle("muted")}>
                Silenciados
              </FilterChip>
              <FilterChip active={filters.topBuyers} onClick={() => toggle("topBuyers")}>
                Top compradores
              </FilterChip>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Ordenar</h3>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={filters.sort === "recent"}
                onClick={() => onChange({ ...filters, sort: "recent" })}
              >
                Mais recentes
              </FilterChip>
              <FilterChip
                active={filters.sort === "oldest"}
                onClick={() => onChange({ ...filters, sort: "oldest" })}
              >
                Mais antigas
              </FilterChip>
            </div>
          </section>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-4 w-full h-12 rounded-full border border-primary text-primary font-semibold hover:bg-primary/10 transition-colors"
        >
          Aplicar filtros
        </button>
      </SheetContent>
    </Sheet>
  );
}
