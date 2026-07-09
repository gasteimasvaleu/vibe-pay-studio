import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, SendHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getThreadWithPartner,
  markThreadRead,
  sendMessage,
  type ChatMessage,
} from "@/lib/chat.functions";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  params: {
    parse: (raw) => {
      const threadId = String(raw.threadId ?? "");
      if (!UUID_RE.test(threadId)) throw notFound();
      return { threadId };
    },
    stringify: (params) => ({ threadId: params.threadId }),
  },
  component: ChatThreadView,
});

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function ChatThreadView() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getThreadFn = useServerFn(getThreadWithPartner);
  const sendFn = useServerFn(sendMessage);
  const markReadFn = useServerFn(markThreadRead);
  const [meId, setMeId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["chat", "messages", threadId],
    queryFn: () => getThreadFn({ data: { threadId } }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const m = payload.new as {
            id: string;
            thread_id: string;
            sender_id: string;
            content: string;
            read_at: string | null;
            created_at: string;
          };
          queryClient.setQueryData<
            { messages: ChatMessage[]; partner: { userId: string; username: string; avatarUrl: string | null } }
          >(["chat", "messages", threadId], (old) => {
            if (!old) return old;
            if (old.messages.some((x) => x.id === m.id)) return old;
            return {
              ...old,
              messages: [
                ...old.messages,
                {
                  id: m.id,
                  threadId: m.thread_id,
                  senderId: m.sender_id,
                  content: m.content,
                  readAt: m.read_at,
                  createdAt: m.created_at,
                },
              ],
            };
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  useEffect(() => {
    if (!data) return;
    markReadFn({ data: { threadId } })
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["chat", "threads"] }),
      )
      .catch(() => {});
  }, [data, threadId, markReadFn, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [data?.messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendFn({ data: { threadId, content } }),
    onSuccess: (msg) => {
      queryClient.setQueryData<
        { messages: ChatMessage[]; partner: { userId: string; username: string; avatarUrl: string | null } }
      >(["chat", "messages", threadId], (old) => {
        if (!old) return old;
        if (old.messages.some((x) => x.id === msg.id)) return old;
        return { ...old, messages: [...old.messages, msg] };
      });
      queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
    },
  });

  const handleSend = () => {
    const content = text.trim();
    if (!content || sendMutation.isPending) return;
    setText("");
    sendMutation.mutate(content);
  };

  return (
    <div className="flex flex-col flex-1 min-h-[100svh] bg-gradient-soft">
      <header className="h-16 shrink-0 flex items-center gap-3 px-4 border-b border-border bg-card/80 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate({ to: "/chat" })}
          className="md:hidden h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-muted-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-10 w-10 rounded-full bg-gradient-primary grid place-items-center text-sm font-semibold text-primary-foreground">
          {(data?.partner.username ?? "??").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate text-foreground">
            @{data?.partner.username ?? "…"}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {isLoading && (
          <div className="text-center text-muted-foreground text-sm">Carregando…</div>
        )}
        {data?.messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-16">
            Envie a primeira mensagem
          </div>
        )}
        {data?.messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                  mine
                    ? "bg-gradient-primary text-primary-foreground rounded-br-md shadow-glow"
                    : "bg-card text-card-foreground border border-border rounded-bl-md shadow-card",
                )}
              >
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                <div
                  className={cn(
                    "text-[10px] mt-1 text-right",
                    mine ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-xl px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escreva uma mensagem…"
            rows={1}
            className="flex-1 min-h-[44px] max-h-40 resize-none focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className="h-11 w-11 shrink-0 grid place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Enviar"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
