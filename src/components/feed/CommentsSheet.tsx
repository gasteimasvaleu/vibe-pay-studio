import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, MessageCircle, Heart, MoreVertical, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import {
  listComments,
  addComment,
  toggleCommentLike,
  deleteComment,
  type PublicationComment,
} from "@/lib/publications.functions";
import { cn } from "@/lib/utils";

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

function CommentRow({
  c,
  isReply,
  canDelete,
  onReply,
  onToggleLike,
  onDelete,
  deleting,
}: {
  c: PublicationComment;
  isReply: boolean;
  canDelete: boolean;
  onReply: (c: PublicationComment) => void;
  onToggleLike: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const avatarSize = isReply ? "h-8 w-8" : "h-9 w-9";
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "shrink-0 rounded-md bg-primary grid place-items-center text-sm font-bold text-white",
          avatarSize,
        )}
      >
        {(c.author_username ?? "?").slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {c.author_username ?? "usuario"}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
        </div>
        <p className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap break-words">
          {c.body}
        </p>
        <button
          type="button"
          onClick={() => onReply(c)}
          className="mt-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Responder
        </button>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {canDelete && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Opções"
                className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={4}
              className="w-auto p-1 rounded-2xl bg-card border border-border shadow-xl"
            >
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Excluir comentário
              </button>
            </PopoverContent>
          </Popover>
        )}

        <button
          type="button"
          aria-label={c.viewer_liked ? "Descurtir" : "Curtir"}
          onClick={() => onToggleLike(c.id)}
          className="flex flex-col items-center gap-0.5 px-1 group"
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-colors",
              c.viewer_liked
                ? "fill-red-500 text-red-500"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          {c.like_count > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground leading-none">
              {c.like_count}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export function CommentsSheet({
  publicationId,
  publicationAuthorId,
  open,
  onOpenChange,
  onCountChange,
  commentsDisabled,
  currentUserName,
}: {
  publicationId: string | null;
  publicationAuthorId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountChange?: (delta: number) => void;
  commentsDisabled?: boolean;
  currentUserName?: string;
}) {
  const queryClient = useQueryClient();
  const list = useServerFn(listComments);
  const create = useServerFn(addComment);
  const toggleLike = useServerFn(toggleCommentLike);
  const removeComment = useServerFn(deleteComment);

  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    username: string;
    rootId: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const queryKey = ["publication-comments", publicationId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => list({ data: { publicationId: publicationId! } }),
    enabled: !!publicationId && open,
  });

  const comments = query.data ?? [];

  const { roots, repliesByParent } = useMemo(() => {
    const sorted = [...comments].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const rootList: PublicationComment[] = [];
    const map: Record<string, PublicationComment[]> = {};
    for (const c of sorted) {
      if (c.parent_id) {
        (map[c.parent_id] ??= []).push(c);
      } else {
        rootList.push(c);
      }
    }
    return { roots: rootList, repliesByParent: map };
  }, [comments]);


  const mutation = useMutation({
    mutationFn: (body: string) =>
      create({
        data: {
          publicationId: publicationId!,
          body,
          parentId: replyingTo?.rootId ?? null,
        },
      }),
    onSuccess: (created) => {
      queryClient.setQueryData<PublicationComment[]>(queryKey, (prev) =>
        prev ? [...prev, created] : [created],
      );
      if (created.parent_id) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.add(created.parent_id!);
          return next;
        });
      }
      setText("");
      setReplyingTo(null);
      onCountChange?.(1);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Erro ao comentar";
      toast.error(msg);
    },
  });

  const likeMutation = useMutation({
    mutationFn: (commentId: string) => toggleLike({ data: { commentId } }),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<PublicationComment[]>(queryKey);
      queryClient.setQueryData<PublicationComment[]>(queryKey, (curr) =>
        curr?.map((c) =>
          c.id === commentId
            ? {
                ...c,
                viewer_liked: !c.viewer_liked,
                like_count: c.like_count + (c.viewer_liked ? -1 : 1),
              }
            : c,
        ),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast.error("Erro ao curtir");
    },
    onSuccess: (res, commentId) => {
      queryClient.setQueryData<PublicationComment[]>(queryKey, (curr) =>
        curr?.map((c) =>
          c.id === commentId
            ? { ...c, viewer_liked: res.liked, like_count: res.likeCount }
            : c,
        ),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => removeComment({ data: { commentId } }),
    onSuccess: (_res, commentId) => {
      queryClient.setQueryData<PublicationComment[]>(queryKey, (curr) => {
        if (!curr) return curr;
        // If deleting a root, also drop its replies from local state.
        const target = curr.find((c) => c.id === commentId);
        if (target && !target.parent_id) {
          return curr.filter((c) => c.id !== commentId && c.parent_id !== commentId);
        }
        return curr.filter((c) => c.id !== commentId);
      });
      onCountChange?.(-1);
      toast.success("Comentário excluído");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Erro ao excluir";
      toast.error(msg);
    },
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const startReply = (c: PublicationComment) => {
    const uname = c.author_username ?? "usuario";
    const rootId = c.parent_id ?? c.id;
    setReplyingTo({ id: c.id, username: uname, rootId });
    setText((t) => (t.startsWith(`@${uname} `) ? t : `@${uname} `));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setText("");
  };

  const toggleThread = (rootId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  };

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate(trimmed);
  };

  const canDeleteFor = (c: PublicationComment) =>
    !!currentUserId &&
    (currentUserId === c.user_id || currentUserId === publicationAuthorId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 gap-0 h-[85vh] rounded-t-3xl bg-background border-border flex flex-col sm:max-w-[650px] sm:mx-auto sm:left-0 sm:right-0"
      >
        <header className="px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Comentários</h2>
        </header>

        <div className="flex-1 min-h-[240px] overflow-y-auto px-5 py-6">
          {query.isLoading ? (
            <p className="text-center text-sm text-muted-foreground">Carregando...</p>
          ) : roots.length === 0 ? (
            <div className="h-full grid place-items-center text-center">
              <div>
                <div className="mx-auto h-12 w-12 rounded-md bg-muted grid place-items-center text-muted-foreground mb-4">
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
            <ul className="space-y-5">
              {roots.map((c) => {
                const replies = repliesByParent[c.id] ?? [];
                const isOpen = expanded.has(c.id);
                return (
                  <li key={c.id}>
                    <CommentRow
                      c={c}
                      isReply={false}
                      canDelete={canDeleteFor(c)}
                      onReply={startReply}
                      onToggleLike={(id) => likeMutation.mutate(id)}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      deleting={deleteMutation.isPending}
                    />

                    {replies.length > 0 && (
                      <div className="mt-3 pl-12">
                        <button
                          type="button"
                          onClick={() => toggleThread(c.id)}
                          className="flex items-center gap-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="h-px w-6 bg-border" />
                          {isOpen
                            ? "Ocultar respostas"
                            : `Ver ${replies.length} ${replies.length === 1 ? "resposta" : "respostas"}`}
                        </button>

                        {isOpen && (
                          <ul className="mt-4 space-y-4">
                            {replies.map((r) => (
                              <li key={r.id}>
                                <CommentRow
                                  c={r}
                                  isReply
                                  canDelete={canDeleteFor(r)}
                                  onReply={startReply}
                                  onToggleLike={(id) => likeMutation.mutate(id)}
                                  onDelete={(id) => deleteMutation.mutate(id)}
                                  deleting={deleteMutation.isPending}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {commentsDisabled ? (
          <div className="px-5 py-4 border-t border-border text-center text-sm text-muted-foreground">
            Comentários desativados nesta publicação.
          </div>
        ) : (
          <div className="border-t border-border">
            {replyingTo && (
              <div className="flex items-center justify-between px-5 py-2.5 bg-muted/60 text-sm text-muted-foreground">
                <span>
                  Respondendo a{" "}
                  <span className="font-semibold text-foreground">
                    {replyingTo.username}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Cancelar resposta"
                  onClick={cancelReply}
                  className="h-7 w-7 grid place-items-center rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="px-4 py-3 flex items-center gap-2">
              <div className="h-9 w-9 shrink-0 rounded-md bg-primary grid place-items-center text-sm font-bold text-white">
                {(currentUserName ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 flex items-center gap-2 rounded-md bg-muted px-4 h-11">
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
                  placeholder={
                    replyingTo
                      ? `Responder a ${replyingTo.username}...`
                      : "Adicione um comentário..."
                  }
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="button"
                aria-label="Enviar"
                onClick={send}
                disabled={!text.trim() || mutation.isPending}
                className="h-11 w-11 grid place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
