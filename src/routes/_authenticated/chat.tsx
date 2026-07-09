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
import { cn } from "@/lib/utils";

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

  // Realtime: refresh thread list on any new message on a thread I'm in
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

  // Presence
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
    <div className="min-h-[100svh] bg-black text-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[340px_1fr] min-h-[100svh]">
        {/* Sidebar */}
        <aside
          className={cn(
            "border-r border-white/10 bg-black/60 backdrop-blur-xl",
            activeThreadId ? "hidden md:flex" : "flex",
            "flex-col",
          )}
        >
          <div className="px-4 pt-6 pb-3 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Conversas</h1>
            <div className="flex items-center gap-1 text-white/70">
              <IconBtn onClick={() => setOpenNewChat(true)} label="Nova conversa">
                <Plus className="h-5 w-5" />
              </IconBtn>
              <IconBtn label="Agenda">
                <CalendarCheck className="h-5 w-5" />
              </IconBtn>
              <IconBtn label="Configurações">
                <Settings className="h-5 w-5" />
              </IconBtn>
              <IconBtn label="Filtros">
                <ListFilter className="h-5 w-5" />
              </IconBtn>
              <IconBtn label="Presença">
                <UserRoundCheck className="h-5 w-5" />
              </IconBtn>
            </div>
          </div>

          <div className="px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                readOnly
                onClick={() => setOpenNewChat(true)}
                placeholder="Pesquisar usuários"
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 cursor-pointer"
              />
            </div>
          </div>

          <div className="px-4 py-4 flex items-center justify-between">
            <span className="text-sm text-white/80">Exibir apenas usuários online</span>
            <Switch checked={onlineOnly} onCheckedChange={setOnlineOnly} />
          </div>

          <div className="border-t border-white/10" />

          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="py-16 text-center text-white/40 italic">Sem conversas</div>
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

        {/* Right panel */}
        <section className={cn(activeThreadId ? "flex" : "hidden md:flex", "flex-col min-h-[100svh]")}>
          <Outlet />
        </section>
      </div>

      <NewChatDialog open={openNewChat} onOpenChange={setOpenNewChat} />
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
      className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
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
          "flex items-center gap-3 px-4 py-3 border-b border-white/5 transition-colors",
          active ? "bg-white/10" : "hover:bg-white/5",
        )}
      >
        <div className="relative">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center text-sm font-semibold">
            {initials(thread.partnerUsername)}
          </div>
          {online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-black" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">@{thread.partnerUsername}</span>
            <span className="text-[11px] text-white/40 shrink-0">
              {formatTime(thread.lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm text-white/50">
              {thread.lastMessage ?? "Sem mensagens"}
            </span>
            {thread.unreadCount > 0 && (
              <span className="shrink-0 min-w-5 h-5 px-1.5 grid place-items-center text-[11px] rounded-full bg-fuchsia-500 text-white font-semibold">
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
      <DialogContent className="bg-black/90 border-white/10 text-white backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white">Nova conversa</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por @username"
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-2">
          {loading && <div className="p-4 text-sm text-white/50">Buscando…</div>}
          {!loading && q.trim() && results.length === 0 && (
            <div className="p-4 text-sm text-white/50">Nenhum usuário encontrado</div>
          )}
          {results.map((u) => (
            <button
              key={u.userId}
              type="button"
              disabled={openMutation.isPending}
              onClick={() => openMutation.mutate(u.userId)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center text-xs font-semibold">
                {initials(u.username)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">@{u.username}</div>
              </div>
              <MessageCircle className="h-4 w-4 text-white/50" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
