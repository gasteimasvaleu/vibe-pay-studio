import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { listComments, addComment } from "@/lib/publications.functions";

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function CommentsSheet({
  publicationId,
  open,
  onOpenChange,
  onCountChange,
  commentsDisabled,
  currentUserName,
}: {
  publicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountChange?: (delta: number) => void;
  commentsDisabled?: boolean;
  currentUserName?: string;
}) {
  const queryClient = useQueryClient();
  const list = useServerFn(listComments);
  const create = useServerFn(addComment);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const query = useQuery({
    queryKey: ["publication-comments", publicationId],
    queryFn: () => list({ data: { publicationId: publicationId! } }),
    enabled: !!publicationId && open,
  });

  const mutation = useMutation({
    mutationFn: (body: string) =>
      create({ data: { publicationId: publicationId!, body } }),
    onSuccess: (created) => {
      queryClient.setQueryData<typeof query.data>(
        ["publication-comments", publicationId],
        (prev) => (prev ? [...prev, created] : [created]),
      );
      setText("");
      onCountChange?.(1);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Erro ao comentar";
      toast.error(msg);
    },
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate(trimmed);
  };

  const comments = query.data ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 gap-0 h-[85vh] rounded-t-3xl bg-background border-border flex flex-col sm:max-w-[480px] sm:mx-auto sm:left-0 sm:right-0"
      >
        <header className="px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Comentários</h2>
        </header>



        <div className="flex-1 min-h-[240px] overflow-y-auto px-5 py-6">
          {query.isLoading ? (
            <p className="text-center text-sm text-muted-foreground">Carregando...</p>
          ) : comments.length === 0 ? (
            <div className="h-full grid place-items-center text-center">
              <div>
                <div className="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center text-muted-foreground mb-4">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <p className="text-xl font-semibold text-foreground leading-snug">
                  Ainda não há
                  <br />
                  nenhum comentário
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Inicie a conversa.</p>
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-primary grid place-items-center text-sm font-bold text-white">
                    {(c.author_username ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        @{c.author_username ?? "usuario"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {commentsDisabled ? (
          <div className="px-5 py-4 border-t border-border text-center text-sm text-muted-foreground">
            Comentários desativados nesta publicação.
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-border flex items-center gap-2">
            <div className="h-9 w-9 shrink-0 rounded-full bg-primary grid place-items-center text-sm font-bold text-white">
              {(currentUserName ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 flex items-center gap-2 rounded-full bg-muted px-4 h-11">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Adicione um comentário..."
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="button"
              aria-label="Enviar"
              onClick={send}
              disabled={!text.trim() || mutation.isPending}
              className="h-11 w-11 grid place-items-center rounded-full bg-muted hover:bg-muted/80 text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>

  );
}
