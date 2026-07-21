import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Loader2 } from "lucide-react";
import { getFeedStoryRings, type StoryRingItem } from "@/lib/stories.functions";
import { PublishStoryDialog } from "./PublishStoryDialog";
import { StoryViewer } from "./StoryViewer";

export function StoriesCarousel({
  currentUserId,
  currentUsername,
  currentAvatarUrl,
  canPublish,
}: {
  currentUserId: string;
  currentUsername: string;
  currentAvatarUrl: string | null;
  canPublish: boolean;
}) {
  const qc = useQueryClient();
  const fetchRings = useServerFn(getFeedStoryRings);
  const [publishOpen, setPublishOpen] = useState(false);
  const [viewerFor, setViewerFor] = useState<string | null>(null);

  const ringsQuery = useQuery({
    queryKey: ["story-rings"],
    queryFn: () => fetchRings(),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const rings = ringsQuery.data ?? [];
  const hasSelfStory = rings.some((r) => r.is_self);
  const otherRings = rings.filter((r) => !r.is_self);
  const selfRing = rings.find((r) => r.is_self) ?? null;

  return (
    <section className="relative">
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:-mx-6 md:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {canPublish && (
          <StoryTile
            avatarUrl={currentAvatarUrl}
            label="Seu story"
            username={currentUsername}
            unseen={0}
            showPlus
            onPlusClick={() => setPublishOpen(true)}
            onClick={() => {
              if (hasSelfStory) setViewerFor(currentUserId);
              else setPublishOpen(true);
            }}
            hasStory={hasSelfStory}
          />
        )}
        {otherRings.map((r) => (
          <StoryTile
            key={r.creator_id}
            avatarUrl={r.avatar_url}
            label={`@${r.username}`}
            username={r.username}
            unseen={r.unseen}
            onClick={() => setViewerFor(r.creator_id)}
            hasStory
          />
        ))}
        {ringsQuery.isLoading && (
          <div className="flex items-center justify-center px-4 text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {!ringsQuery.isLoading && !canPublish && rings.length === 0 && (
          <div className="text-xs text-white/50 px-2 py-4">
            Nenhum story dos creators que você segue no momento.
          </div>
        )}
      </div>

      <PublishStoryDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        onPublished={() => {
          void qc.invalidateQueries({ queryKey: ["story-rings"] });
        }}
      />

      <StoryViewer
        creatorId={viewerFor}
        open={!!viewerFor}
        onOpenChange={(v) => !v && setViewerFor(null)}
        onChanged={() => {
          void qc.invalidateQueries({ queryKey: ["story-rings"] });
        }}
      />
    </section>
  );
}

function StoryTile({
  avatarUrl,
  label,
  username,
  unseen,
  showPlus,
  hasStory,
  onClick,
  onPlusClick,
}: {
  avatarUrl: string | null;
  label: string;
  username: string;
  unseen: number;
  showPlus?: boolean;
  hasStory?: boolean;
  onClick: () => void;
  onPlusClick?: () => void;
}) {
  const initial = (username || "?").slice(0, 1).toUpperCase();
  const ringClass = hasStory
    ? unseen > 0
      ? "bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-pink-500"
      : "bg-white/20"
    : "bg-white/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className="snap-start shrink-0 flex flex-col items-center gap-1 w-[76px]"
    >
      <div className={`relative p-[2.5px] rounded-full ${ringClass}`}>
        <div className="rounded-full bg-[#0b0518] p-[2px]">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={label} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-white/80">{initial}</span>
            )}
          </div>
        </div>
        {showPlus && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlusClick?.();
            }}
            className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-600 border-2 border-[#0b0518] grid place-items-center"
            aria-label="Publicar story"
          >
            <Plus className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </button>
        )}
      </div>
      <span className="text-[11px] text-white/80 truncate max-w-[72px]">{label}</span>
    </button>
  );
}
