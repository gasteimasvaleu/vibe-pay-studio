import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  userId: string;
  creatorProfileId?: string | null;
};

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}min`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

function formatLastPost(iso: string | null) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const diffDays = Math.floor((Date.now() - then) / 86400000);
  if (diffDays <= 0) return "Postou hoje";
  if (diffDays === 1) return "Postou ontem";
  if (diffDays < 30) return `Postou há ${diffDays} dias`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `Postou há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `Postou há ${years} ${years === 1 ? "ano" : "anos"}`;
}

export function ContentSummaryStrip({ userId, creatorProfileId }: Props) {
  const { data } = useQuery({
    queryKey: ["creator-content-stats", userId, creatorProfileId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("creator_content_stats", {
        _author_id: userId,
        _creator_profile_id: creatorProfileId ?? undefined,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      return {
        videoSeconds: Number(row?.video_seconds ?? 0),
        lastPostAt: (row?.last_post_at as string | null) ?? null,
      };
    },
  });

  const videoSeconds = data?.videoSeconds ?? 0;
  const lastPost = formatLastPost(data?.lastPostAt ?? null);

  if (videoSeconds <= 0 && !lastPost) return null;

  return (
    <div className="pr-4 md:pr-6 pt-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-secondary/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">
            {videoSeconds > 0 ? (
              <>
                <span className="font-bold text-foreground">
                  {formatDuration(videoSeconds)}
                </span>{" "}
                de conteúdo
              </>
            ) : (
              "Sem vídeos publicados"
            )}
          </span>
        </div>
        {lastPost && (
          <span className="shrink-0 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {lastPost}
          </span>
        )}
      </div>
    </div>
  );
}
