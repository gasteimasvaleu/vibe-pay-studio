import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Archive, Loader2 } from "lucide-react";
import { getArchivedPublications } from "@/lib/publications.functions";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { PublicationCard } from "@/components/feed/PublicationCard";

export const Route = createFileRoute("/_authenticated/postsarquivados")({
  head: () => ({
    meta: [
      { title: "Posts arquivados · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ArchivedPostsPage,
});

const QUERY_KEY = ["archived-posts"] as const;

function ArchivedPostsPage() {
  const router = useRouter();
  const fetchArchived = useServerFn(getArchivedPublications);

  const query = useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) =>
      fetchArchived({ data: { limit: 10, cursor: pageParam ?? undefined } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const sentinelRef = useInfiniteScrollSentinel<HTMLDivElement>({
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-white">
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
            Posts arquivados
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4">
        {query.isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length > 0 ? (
          <>
            {items.map((item) => (
              <PublicationCard key={item.id} item={item} queryKey={QUERY_KEY} />
            ))}
            <div ref={sentinelRef} className="h-8" />
            {query.isFetchingNextPage && (
              <div className="flex justify-center py-4 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {!query.hasNextPage && (
              <p className="text-center text-xs text-muted-foreground py-4">
                Você chegou ao fim.
              </p>
            )}
          </>
        ) : (
          <div className="mt-10 grid place-items-center px-4 text-center">
            <div className="h-14 w-14 rounded-md bg-primary/10 grid place-items-center text-primary">
              <Archive className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base md:text-lg font-medium text-foreground">
              Nenhum post arquivado
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Posts que você arquivar aparecerão aqui e continuarão ocultos do
              feed e do seu perfil.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
