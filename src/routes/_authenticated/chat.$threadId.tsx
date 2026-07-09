import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
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

  // Realtime insertions
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

  // Mark read whenever thread opens or new messages arrive
  useEffect(() => {
    if (!data) return;
    markReadFn({ data: { threadId } })
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["chat", "threads"] }),
      )
      .catch(() => {});
  }, [data, threadId, markReadFn, queryClient]);

  // Autoscroll
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
    <div className="flex flex-col flex-1 min-h-[100svh] bg-[radial-gradient(ellipse_at_top,rgba(217,70,239,0.06),transparent_60%)]">
      {/* Header */}
      <header className="h-16 shrink-0 flex items-center gap-3 px-4 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate({ to: "/chat" })}
          className="md:hidden h-9 w-9 grid place-items-center rounded-full hover:bg-white/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center text-sm font-semibold">
          {(data?.partner.username ?? "??").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">
            @{data?.partner.username ?? "…"}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {isLoading && (
          <div className="text-center text-white/40 text-sm">Carregando…</div>
        )}
        {data?.messages.length === 0 && (
          <div className="text-center text-white/40 text-sm py-16">
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
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm",
                  mine
                    ? "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white rounded-br-md"
                    : "bg-white/5 border border-white/10 text-white rounded-bl-md",
                )}
              >
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                <div
                  className={cn(
                    "text-[10px] mt-1 text-right",
                    mine ? "text-white/70" : "text-white/40",
                  )}
                >
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
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
            className="flex-1 min-h-[44px] max-h-40 resize-none bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-fuchsia-500"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className="h-11 w-11 shrink-0 grid place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Enviar"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
