import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmAltaSection } from "@/components/em-alta/EmAltaSection";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmAltaFeed } from "@/lib/em-alta.functions";
import { emptyEmAltaFeed } from "@/lib/em-alta.types";
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

export const Route = createFileRoute("/_authenticated/em-alta/")({
  head: () => ({
    meta: [
      { title: "Em Alta · Monetisexy" },
      {
        name: "description",
        content:
          "Descubra quem está em alta agora: top creators, ofertas de assinatura, perfis gratuitos, lives e muito mais.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw redirect({ to: "/entrar" });
    const { data: profile } = await supabase
      .from("profiles_public" as any)
      .select("username, avatar_url, account_type")
      .eq("user_id", user.id)
      .maybeSingle();
    const acct = profile?.account_type ?? "subscriber";
    return {
      username: profile?.username ?? user.email?.split("@")[0] ?? "voce",
      avatarUrl: profile?.avatar_url ?? null,
      isCreator: acct === "creator" || acct === "free_creator",
    };
  },
  component: EmAltaPage,
});

function EmAltaPage() {
  const { username, avatarUrl, isCreator } = Route.useRouteContext();

  const { data, isLoading } = useQuery({
    queryKey: ["em-alta-feed"],
    queryFn: () => getEmAltaFeed(),
    staleTime: 5 * 60 * 1000,
  });

  const feed = data ?? emptyEmAltaFeed;
  const isEmpty =
    !isLoading &&
    Object.values(feed).every((list) => !Array.isArray(list) || list.length === 0);

  return (
    <DashboardShell
      username={username}
      isCreator={isCreator}
      avatarUrl={avatarUrl}
      title="Em alta"
      hideProfileCard
    >
      {isLoading ? (
        <div className="space-y-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="flex gap-3 overflow-hidden">
                {[0, 1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-52 w-40 shrink-0 rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            Ainda não há destaques por aqui
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Assim que os criadores começarem a publicar, vender e transmitir, os
            rankings aparecem nesta página.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {feed.topCreators.length > 0 && (
            <EmAltaSection title="Top creators" section="top-creators">
              {feed.topCreators.map((item, i) => (
                <TopCreatorCard key={item.id} item={item} rank={i + 1} />
              ))}
            </EmAltaSection>
          )}

          {feed.ofertas.length > 0 && (
            <EmAltaSection
              title="Ofertas de assinatura" section="ofertas"
              icon={<Sparkles className="h-5 w-5 text-primary" />}
            >
              {feed.ofertas.map((item) => (
                <OfertaCard key={item.id} item={item} />
              ))}
            </EmAltaSection>
          )}

          {feed.perfisGratuitos.length > 0 && (
            <EmAltaSection title="Perfis gratuitos" section="perfis-gratuitos">
              {feed.perfisGratuitos.map((item, i) => (
                <PerfilGratuitoCard key={item.id} item={item} rank={i + 1} />
              ))}
            </EmAltaSection>
          )}

          {feed.maisMimadas.length > 0 && (
            <EmAltaSection title="As mais mimadas" section="mais-mimadas">
              {feed.maisMimadas.map((item, i) => (
                <MimadaCard key={item.id} item={item} rank={i + 1} />
              ))}
            </EmAltaSection>
          )}

          {feed.rumoAoTopo.length > 0 && (
            <EmAltaSection title="Rumo ao topo" section="rumo-ao-topo">
              {feed.rumoAoTopo.map((item, i) => (
                <RumoAoTopoCard key={item.id} item={item} rank={i + 1} />
              ))}
            </EmAltaSection>
          )}

          {feed.emAltaNosPosts.length > 0 && (
            <EmAltaSection title="Em alta nos posts" section="posts">
              {feed.emAltaNosPosts.map((item, i) => (
                <PostEmAltaCard key={item.id} item={item} rank={i + 1} />
              ))}
            </EmAltaSection>
          )}

          {feed.bombandoNoChat.length > 0 && (
            <EmAltaSection title="Bombando no chat" section="chat">
              {feed.bombandoNoChat.map((item, i) => (
                <ChatBombandoCard key={item.id} item={item} rank={i + 1} />
              ))}
            </EmAltaSection>
          )}

          {feed.chamadaUmAUm.length > 0 && (
            <EmAltaSection title="Chamada Um a Um" section="um-a-um">
              {feed.chamadaUmAUm.map((item, i) => (
                <UmAUmCard key={item.id} item={item} rank={i + 1} />
              ))}
            </EmAltaSection>
          )}

          {feed.liveNasAlturas.length > 0 && (
            <EmAltaSection title="Live nas alturas" section="lives">
              {feed.liveNasAlturas.map((item, i) => (
                <LiveCard key={item.id} item={item} rank={i + 1} />
              ))}
            </EmAltaSection>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
