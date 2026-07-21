import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, BadgeCheck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import { resolveViewerCountry } from "@/lib/geo.functions";


export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Buscar · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

type CreatorRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  kyc_verified_at: string | null;
};

const PAGE_SIZE = 20;

function escapeIlike(input: string) {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}

async function fetchCreators({
  query,
  pageParam,
  viewerId,
}: {
  query: string;
  pageParam: number;
  viewerId: string | null;
}) {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const trimmed = query.trim();
  const isMentionLookup = trimmed.startsWith("@");
  const term = isMentionLookup ? trimmed.slice(1) : trimmed;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, cover_url, kyc_verified_at")
    .order("created_at", { ascending: false })
    .range(from, to);

  // Respect global search restriction (own profile never filtered).
  q = q.or(
    viewerId
      ? `restrict_search.eq.false,user_id.eq.${viewerId}`
      : "restrict_search.eq.false",
  );
  // TODO: split restrict_search_br / restrict_search_country once IP geo is available.
  // For now both act as "hide from all searches" (same effect as restrict_search).
  q = q.or(
    viewerId
      ? `restrict_search_br.eq.false,user_id.eq.${viewerId}`
      : "restrict_search_br.eq.false",
  );
  q = q.or(
    viewerId
      ? `restrict_search_country.eq.false,user_id.eq.${viewerId}`
      : "restrict_search_country.eq.false",
  );

  // @mention lookup — also honor restrict_mentions.
  if (isMentionLookup) {
    q = q.or(
      viewerId
        ? `restrict_mentions.eq.false,user_id.eq.${viewerId}`
        : "restrict_mentions.eq.false",
    );
  }

  if (term.length > 0) {
    const pattern = `%${escapeIlike(term)}%`;
    q = q.or(`username.ilike.${pattern},display_name.ilike.${pattern}`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return {
    items: (data ?? []) as CreatorRow[],
    nextPage: (data?.length ?? 0) < PAGE_SIZE ? undefined : pageParam + 1,
  };
}

function SearchPage() {
  const [rawQuery, setRawQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setViewerId(data.user?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(rawQuery), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const query = useInfiniteQuery({
    queryKey: ["creator-search", debounced, viewerId] as const,
    queryFn: ({ pageParam }) =>
      fetchCreators({ query: debounced, pageParam, viewerId }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const sentinelRef = useInfiniteScrollSentinel<HTMLDivElement>({
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  });

  const heading = debounced.trim().length > 0 ? "Resultados" : "Mais buscados";

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Buscar por creators ou tópicos"
            className="pl-11 h-12 rounded-full bg-muted border-0"
            autoFocus
          />
        </div>

        <h2 className="text-lg font-bold text-foreground">{heading}</h2>

        {query.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-card border border-border h-48 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            {debounced.trim().length > 0
              ? `Nenhum creator encontrado para "${debounced}".`
              : "Nenhum creator disponível."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((c) => (
              <CreatorCard key={c.user_id} creator={c} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-8" />
        {query.isFetchingNextPage && (
          <div className="flex justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}

function CreatorCard({ creator }: { creator: CreatorRow }) {
  const displayName = creator.display_name ?? creator.username;
  const initials = displayName.slice(0, 2).toUpperCase();
  const verified = !!creator.kyc_verified_at;

  return (
    <Link
      to="/perfil/$username"
      params={{ username: creator.username }}
      className="relative block rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="h-28 w-full bg-muted overflow-hidden">
        {creator.cover_url ? (
          <img
            src={creator.cover_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10" />
        )}
      </div>
      <div className="pl-28 pr-4 py-4 min-h-[72px]">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground truncate">
            {displayName}
          </span>
          {verified && (
            <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          @{creator.username}
        </p>
      </div>
      <Avatar className="absolute left-4 top-16 h-24 w-24 border-4 border-card z-10">
        <AvatarImage src={creator.avatar_url ?? undefined} alt={displayName} />
        <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
}
