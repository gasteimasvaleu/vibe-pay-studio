import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, notFound, useRouter } from "@tanstack/react-router";
import { MediaLightbox } from "@/components/feed/MediaLightbox";
import { useSuspenseQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  MoreVertical,
  Image as ImageIcon,
  Smartphone,
  Film,
  CalendarCheck,
  Archive,
  Settings,
  BadgeCheck,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { isCreatorLike, type AccountType } from "@/lib/auth";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";
import {
  getUserPublications,
  getUserMediasGrid,
  type FeedItem,
  type GridMediaItem,
  type GridMediaFilter,
} from "@/lib/publications.functions";
import { PublicationCard } from "@/components/feed/PublicationCard";
import { setActiveCreatorProfile } from "@/lib/creator-profile.functions";

type ProfileData = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  postsCount: number;
  mediasCount: number;
  accountType: AccountType;
  isFreeView: boolean;
  creatorProfileId: string | null;
};

async function fetchProfileByUsername(username: string): Promise<ProfileData> {
  // Tenta resolver diretamente pelo creator_profiles (fonte de verdade por perfil).
  const { data: creatorProfile, error: cpError } = await supabase
    .from("creator_profiles")
    .select(
      "id, user_id, kind, username, display_name, bio, avatar_url, cover_url",
    )
    .eq("username", username)
    .maybeSingle();
  if (cpError) throw new Error(cpError.message);

  let profile: any = creatorProfile;
  let isFreeView = false;
  let creatorProfileId: string | null = creatorProfile?.id ?? null;

  if (!profile) {
    // Fallback legado: profiles com free_username.
    const { data: legacyProfile, error } = await supabase
      .from("profiles")
      .select(
        "user_id, username, display_name, bio, avatar_url, cover_url, account_type, free_username, free_display_name, free_avatar_url",
      )
      .or(`username.eq.${username},free_username.eq.${username}`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!legacyProfile) throw notFound();

    profile = legacyProfile;
    isFreeView = (legacyProfile as any).free_username === username && legacyProfile.username !== username;

    const { data: cp } = await supabase
      .from("creator_profiles")
      .select("id, kind")
      .eq("user_id", legacyProfile.user_id);
    creatorProfileId =
      (cp ?? []).find((r: any) => r.kind === (isFreeView ? "free" : "paid"))?.id ?? null;
  } else {
    isFreeView = creatorProfile!.kind === "free";
  }

  const userId = profile.user_id;

  const pubsQuery = supabase
    .from("publications")
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId);
  const mediasQuery = supabase
    .from("publication_media")
    .select("id, publications!inner(author_id, creator_profile_id)", { count: "exact", head: true })
    .eq("publications.author_id", userId);

  const [{ count: postsCount }, { count: mediasCount }] = await Promise.all([
    creatorProfileId ? pubsQuery.eq("creator_profile_id", creatorProfileId) : pubsQuery,
    creatorProfileId
      ? mediasQuery.eq("publications.creator_profile_id", creatorProfileId)
      : mediasQuery,
  ]);

  const isCreatorProfile = !!creatorProfile;
  const accountType = isCreatorProfile
    ? (creatorProfile!.kind === "free" ? "free_creator" : "creator")
    : (isFreeView ? "free_creator" : ((profile.account_type ?? "subscriber") as AccountType));

  return {
    userId,
    username,
    displayName: (profile.display_name ?? username) as string,
    bio: (profile.bio ?? "") as string,
    avatarUrl: (profile.avatar_url ?? null) as string | null,
    coverUrl: (profile.cover_url ?? null) as string | null,
    postsCount: postsCount ?? 0,
    mediasCount: mediasCount ?? 0,
    accountType,
    isFreeView,
    creatorProfileId,
  };
}

const profileQueryOptions = (username: string) => ({
  queryKey: ["profile-page", username] as const,
  queryFn: () => fetchProfileByUsername(username),
});

export const Route = createFileRoute("/_authenticated/profile/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} · Monetisexy` },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(profileQueryOptions(params.username)),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"posts" | "medias">("posts");
  const [mediaFilter, setMediaFilter] = useState<GridMediaFilter>("all");
  const [openMedia, setOpenMedia] = useState<GridMediaItem | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const { data: profile } = useSuspenseQuery(profileQueryOptions(username));

  const initials = (profile.displayName || profile.username).slice(0, 2).toUpperCase();

  const fetchUserPubs = useServerFn(getUserPublications);
  const fetchMedias = useServerFn(getUserMediasGrid);
  const setActiveCreatorProfileFn = useServerFn(setActiveCreatorProfile);
  const [editingProfile, setEditingProfile] = useState(false);

  const handleEditProfile = async () => {
    if (editingProfile) return;
    setEditingProfile(true);
    try {
      if (profile.creatorProfileId && isCreatorLike(profile.accountType)) {
        await setActiveCreatorProfileFn({ data: { creatorProfileId: profile.creatorProfileId } });
        await queryClient.invalidateQueries();
        await router.invalidate();
      }
      await navigate({
        to: isCreatorLike(profile.accountType) ? "/settings/creator" : "/settings/myprofile",
      });
    } finally {
      setEditingProfile(false);
    }
  };

  const postsQueryKey = ["user-feed", profile.userId, profile.creatorProfileId] as const;
  const postsQuery = useInfiniteQuery({
    queryKey: postsQueryKey,
    queryFn: ({ pageParam }) =>
      fetchUserPubs({
        data: {
          userId: profile.userId,
          limit: 10,
          cursor: pageParam ?? undefined,
          creatorProfileId: profile.creatorProfileId ?? undefined,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: activeTab === "posts",
  });

  const mediasQuery = useInfiniteQuery({
    queryKey: ["user-medias-grid", profile.userId, profile.creatorProfileId, mediaFilter],
    queryFn: ({ pageParam }) =>
      fetchMedias({
        data: {
          userId: profile.userId,
          limit: 24,
          cursor: pageParam ?? undefined,
          filter: mediaFilter,
          creatorProfileId: profile.creatorProfileId ?? undefined,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: activeTab === "medias",
  });

  const postsSentinel = useInfiniteScrollSentinel<HTMLDivElement>({
    hasNextPage: postsQuery.hasNextPage,
    isFetchingNextPage: postsQuery.isFetchingNextPage,
    fetchNextPage: postsQuery.fetchNextPage,
  });
  const mediasSentinel = useInfiniteScrollSentinel<HTMLDivElement>({
    hasNextPage: mediasQuery.hasNextPage,
    isFetchingNextPage: mediasQuery.isFetchingNextPage,
    fetchNextPage: mediasQuery.fetchNextPage,
  });

  const postsItems: FeedItem[] = postsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const mediasItems: GridMediaItem[] = mediasQuery.data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    if (!pendingScrollId || activeTab !== "posts") return;
    const found = postsItems.some((p) => p.id === pendingScrollId);
    if (!found) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`pub-${pendingScrollId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("ring-2", "ring-primary", "rounded-3xl");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "rounded-3xl");
        }, 2000);
      }
      setPendingScrollId(null);
    }, 100);
    return () => clearTimeout(t);
  }, [pendingScrollId, activeTab, postsItems]);

  const handleOpenPost = (publicationId: string) => {
    setOpenMedia(null);
    setActiveTab("posts");
    setPendingScrollId(publicationId);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard" })}
          className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-foreground truncate">Meu perfil</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Mais opções">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
            <DropdownMenuItem className="gap-3 rounded-xl py-3 text-base">
              <CalendarCheck className="h-5 w-5" />
              Posts agendados
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 rounded-xl py-3 text-base"
              onSelect={() => navigate({ to: "/postsarquivados" })}
            >
              <Archive className="h-5 w-5" />
              Arquivados
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 rounded-xl py-3 text-base"
              disabled={editingProfile}
              onSelect={(event) => {
                event.preventDefault();
                void handleEditProfile();
              }}
            >
              <Settings className="h-5 w-5" />
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 rounded-xl py-3 text-base">
              <BadgeCheck className="h-5 w-5" />
              Solicitar verificação
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-4">
        {/* Profile card */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Cover */}
          <div
            className="relative h-32 bg-muted"
            style={
              profile.coverUrl
                ? {
                    backgroundImage: `url(${profile.coverUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {
                    backgroundImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><text x='10' y='40' font-family='sans-serif' font-size='36' font-weight='bold' fill='%23ffffff' opacity='0.6'>m</text></svg>\")",
                    backgroundRepeat: "repeat",
                  }
            }
          >
            <div className="absolute bottom-2 right-3 flex items-center gap-1 text-sm text-foreground/80">
              <ImageIcon className="h-4 w-4" />
              <span>{profile.mediasCount}</span>
            </div>
          </div>

          {/* Avatar + info */}
          <div className="px-5 pb-5">
            <div className="-mt-12 mb-3">
              <Avatar className="h-24 w-24 border-4 border-card shadow-sm">
                <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName} />
                <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <h2 className="text-2xl font-bold text-foreground">{profile.displayName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              @{profile.username}
            </p>
            {profile.bio && (
              <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">{profile.bio}</p>
            )}

            <button
              type="button"
              onClick={handleEditProfile}
              disabled={editingProfile}
              className="mt-5 w-full rounded-md bg-muted py-3 text-base font-semibold text-foreground hover:bg-muted/80 transition-colors"
            >
              {editingProfile ? "Abrindo…" : "Editar perfil"}
            </button>
          </div>
        </section>

        {/* Tabs */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={`relative flex items-center justify-center gap-2 py-4 text-base font-medium transition-colors ${
                activeTab === "posts"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Smartphone className="h-5 w-5" />
              {profile.postsCount} Postagens
              {activeTab === "posts" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("medias")}
              className={`relative flex items-center justify-center gap-2 py-4 text-base font-medium transition-colors ${
                activeTab === "medias"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Film className="h-5 w-5" />
              {profile.mediasCount} Mídias
              {activeTab === "medias" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </section>

        {/* Content */}
        {activeTab === "posts" ? (
          <PostsList
            items={postsItems}
            queryKey={postsQueryKey}
            isLoading={postsQuery.isLoading}
            isFetchingNextPage={postsQuery.isFetchingNextPage}
            hasNextPage={!!postsQuery.hasNextPage}
            sentinelRef={postsSentinel}
          />
        ) : (
          <MediasSection
            filter={mediaFilter}
            onFilterChange={setMediaFilter}
            items={mediasItems}
            isLoading={mediasQuery.isLoading}
            isFetchingNextPage={mediasQuery.isFetchingNextPage}
            hasNextPage={!!mediasQuery.hasNextPage}
            sentinelRef={mediasSentinel}
            onOpen={setOpenMedia}
          />
        )}
      </div>

      <MediaLightbox
        item={openMedia}
        onClose={() => setOpenMedia(null)}
        onOpenPost={handleOpenPost}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function PostsList({
  items,
  queryKey,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  sentinelRef,
}: {
  items: FeedItem[];
  queryKey: readonly unknown[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-border bg-card h-80 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!isLoading && items.length === 0) return <EmptyState message="Nenhuma postagem ainda." />;
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} id={`pub-${item.id}`} className="transition-all">
          <PublicationCard item={item} queryKey={queryKey} />
        </div>
      ))}
      <div ref={sentinelRef} className="h-8" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {!hasNextPage && items.length > 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">Fim das postagens.</p>
      )}
    </div>
  );
}

const FILTERS: Array<{ id: GridMediaFilter; label: string; empty: string }> = [
  { id: "all", label: "Todos", empty: "Nenhuma mídia ainda." },
  { id: "photos", label: "Fotos", empty: "Nenhuma foto ainda." },
  { id: "videos", label: "Vídeos", empty: "Nenhum vídeo ainda." },
  { id: "paid", label: "Pagos", empty: "Nenhuma mídia paga ainda." },
];

function MediasSection({
  filter,
  onFilterChange,
  items,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  sentinelRef,
  onOpen,
}: {
  filter: GridMediaFilter;
  onFilterChange: (f: GridMediaFilter) => void;
  items: GridMediaItem[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  onOpen: (item: GridMediaItem) => void;
}) {
  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0]!;
  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-border bg-card px-3 py-3">
        <div className="flex items-center justify-center gap-2 sm:gap-6 overflow-x-auto">
          {FILTERS.map((f) => {
            const isActive = f.id === filter;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      {isLoading && items.length === 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-sm" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState message={active.empty} />
      ) : (
        <div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onOpen(m)}
                className="relative aspect-square overflow-hidden bg-muted"
              >
                {m.type === "video" ? (
                  <>
                    <video
                      src={m.url}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    <Film className="absolute top-1.5 right-1.5 h-4 w-4 text-white drop-shadow" />
                  </>
                ) : (
                  <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
          <div ref={sentinelRef} className="h-8" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!hasNextPage && items.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">Fim das mídias.</p>
          )}
        </div>
      )}
    </div>
  );
}
