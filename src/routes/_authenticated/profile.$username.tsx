import { useState } from "react";
import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

type ProfileData = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  postsCount: number;
  mediasCount: number;
};

async function fetchProfileByUsername(username: string): Promise<ProfileData> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, bio, avatar_url, cover_url")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) throw notFound();

  const [{ count: postsCount }, { count: mediasCount }] = await Promise.all([
    supabase
      .from("publications")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.user_id),
    supabase
      .from("publication_media")
      .select("id, publications!inner(author_id)", { count: "exact", head: true })
      .eq("publications.author_id", profile.user_id),
  ]);

  return {
    userId: profile.user_id,
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
    bio: profile.bio ?? "",
    avatarUrl: profile.avatar_url,
    coverUrl: profile.cover_url,
    postsCount: postsCount ?? 0,
    mediasCount: mediasCount ?? 0,
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
  const [activeTab, setActiveTab] = useState<"posts" | "medias">("posts");
  const { data: profile } = useSuspenseQuery(profileQueryOptions(username));

  const initials = (profile.displayName || profile.username).slice(0, 2).toUpperCase();

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
            <DropdownMenuItem className="gap-3 rounded-xl py-3 text-base">
              <Archive className="h-5 w-5" />
              Arquivados
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 rounded-xl py-3 text-base"
              onSelect={() => navigate({ to: "/settings/myprofile" })}
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
              onClick={() => navigate({ to: "/settings/myprofile" })}
              className="mt-5 w-full rounded-full bg-muted py-3 text-base font-semibold text-foreground hover:bg-muted/80 transition-colors"
            >
              Editar perfil
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
      </div>
    </div>
  );
}
