import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  Clock,
  Loader2,
  MoreVertical,
  Play,
  CalendarClock,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getScheduledPublications,
  reschedulePublication,
  publishScheduledNow,
  deletePublication,
  type ScheduledPublicationItem,
} from "@/lib/publications.functions";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/publicacoes-agendadas")({
  head: () => ({
    meta: [
      { title: "Publicações agendadas · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ScheduledPostsPage,
});

const QUERY_KEY = ["scheduled-posts"] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScheduledPostsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fetchScheduled = useServerFn(getScheduledPublications);
  const rescheduleFn = useServerFn(reschedulePublication);
  const publishNowFn = useServerFn(publishScheduledNow);
  const deleteFn = useServerFn(deletePublication);

  const [rescheduleTarget, setRescheduleTarget] =
    useState<ScheduledPublicationItem | null>(null);
  const [newDate, setNewDate] = useState("");

  const query = useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) =>
      fetchScheduled({ data: { limit: 20, cursor: pageParam ?? undefined } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishNowFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Publicação publicada agora");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Agendamento cancelado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rescheduleMutation = useMutation({
    mutationFn: (input: { id: string; scheduledAt: string }) =>
      rescheduleFn({ data: input }),
    onSuccess: () => {
      toast.success("Data atualizada");
      setRescheduleTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sentinelRef = useInfiniteScrollSentinel<HTMLDivElement>({
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  });

  const openReschedule = (item: ScheduledPublicationItem) => {
    setRescheduleTarget(item);
    setNewDate(toDatetimeLocal(item.scheduled_at));
  };

  const confirmReschedule = () => {
    if (!rescheduleTarget || !newDate) return;
    const iso = new Date(newDate).toISOString();
    rescheduleMutation.mutate({ id: rescheduleTarget.id, scheduledAt: iso });
  };

  const confirmCancel = (id: string) => {
    if (!window.confirm("Cancelar este agendamento? A publicação será removida.")) return;
    cancelMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Publicações agendadas
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-3">
        {query.isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length > 0 ? (
          <>
            {items.map((item) => {
              const thumb = item.media[0];
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted grid place-items-center">
                    {thumb ? (
                      <img
                        src={thumb.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDate(item.scheduled_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-foreground line-clamp-2">
                      {item.caption?.trim() || "Sem legenda"}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="uppercase tracking-wide">
                        {item.visibility === "paid"
                          ? "Pago"
                          : item.visibility === "challenge"
                            ? "Desafio"
                            : "Público"}
                      </span>
                      {item.price_cents ? (
                        <span>
                          · R$ {(item.price_cents / 100).toFixed(2).replace(".", ",")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Ações"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        onClick={() => publishMutation.mutate(item.id)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Publicar agora
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openReschedule(item)}>
                        <CalendarClock className="h-4 w-4 mr-2" />
                        Reagendar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => confirmCancel(item.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancelar agendamento
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            <div ref={sentinelRef} className="h-8" />
            {query.isFetchingNextPage && (
              <div className="flex justify-center py-4 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-16">
            <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
            Você não tem publicações agendadas.
          </div>
        )}
      </main>

      <Dialog
        open={rescheduleTarget !== null}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar publicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scheduled-at">Nova data e hora</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleTarget(null)}
              disabled={rescheduleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmReschedule}
              disabled={!newDate || rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
