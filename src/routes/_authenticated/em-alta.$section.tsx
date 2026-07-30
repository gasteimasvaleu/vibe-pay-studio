import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles } from "lucide-react";
import { getEmAltaSection } from "@/lib/em-alta.functions";
import {
  EM_ALTA_SECTIONS,
  isEmAltaSectionSlug,
  type EmAltaSectionSlug,
} from "@/lib/em-alta.types";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import {
  ChatBombandoCard,
  LiveCard,
  MimadaCard,
  OfertaCard,
  PerfilGratuitoCard,
  PostEmAltaCard,
  RumoAoTopoCard,
  TopCreatorCard,
  UmAUmCard,
} from "@/components/em-alta/Cards";

const PAGE_SIZE = 24;

export const Route = createFileRoute("/_authenticated/em-alta/$section")({
  head: ({ params }) => {
    const title = isEmAltaSectionSlug(params.section)
      ? EM_ALTA_SECTIONS[params.section].title
      : "Em alta";
    return {
      meta: [
        { title: `${title} · Em Alta · Monetisexy` },
        {
          name: "description",
          content: `Veja o ranking completo de ${title.toLowerCase()} na Monetisexy.`,
        },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  beforeLoad: async ({ params }) => {
    if (!isEmAltaSectionSlug(params.section)) throw notFound();
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: EmAltaSectionPage,
});

function renderCard(section: EmAltaSectionSlug, item: any, rank: number) {
  switch (section) {
    case "top-creators":
      return <TopCreatorCard key={item.id} item={item} rank={rank} />;
    case "ofertas":
      return <OfertaCard key={item.id} item={item} />;
    case "perfis-gratuitos":
      return <PerfilGratuitoCard key={item.id} item={item} rank={rank} />;
    case "mais-mimadas":
      return <MimadaCard key={item.id} item={item} rank={rank} />;
    case "rumo-ao-topo":
      return <RumoAoTopoCard key={item.id} item={item} rank={rank} />;
    case "posts":
      return <PostEmAltaCard key={item.id} item={item} rank={rank} />;
    case "chat":
      return <ChatBombandoCard key={item.id} item={item} rank={rank} />;
    case "um-a-um":
      return <UmAUmCard key={item.id} item={item} rank={rank} />;
    case "lives":
      return <LiveCard key={item.id} item={item} rank={rank} />;
  }
}

function EmAltaSectionPage() {
  const { section } = Route.useParams();
  const slug = section as EmAltaSectionSlug;
  const meta = EM_ALTA_SECTIONS[slug];

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["em-alta-section", slug],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getEmAltaSection({
        data: { section: slug, offset: pageParam as number, limit: PAGE_SIZE },
      }),
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as any[]).length < PAGE_SIZE
        ? undefined
        : allPages.reduce((acc, p) => acc + (p as any[]).length, 0),
    staleTime: 5 * 60 * 1000,
  });

  const items = (data?.pages.flat() ?? []) as any[];

  const sentinelRef = useInfiniteScrollSentinel<HTMLDivElement>({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  return (
    <DashboardShell username="" isCreator={false} title={meta?.title ?? "Em alta"} hideProfileCard>
      {isLoading ? (
        <div className="flex flex-wrap gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-52 w-40 shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            Ainda não há destaques por aqui
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Assim que houver movimento nesta categoria, o ranking aparece aqui.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {items.map((item, i) => renderCard(slug, item, i + 1))}
          </div>
          <div ref={sentinelRef} className="h-8" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
