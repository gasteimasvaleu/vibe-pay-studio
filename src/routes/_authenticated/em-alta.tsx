import { createFileRoute, redirect } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmAltaSection } from "@/components/em-alta/EmAltaSection";
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
import {
  bombandoNoChat,
  chamadaUmAUm,
  emAltaNosPosts,
  liveNasAlturas,
  maisMimadas,
  ofertas,
  perfisGratuitos,
  rumoAoTopo,
  topCreators,
} from "@/lib/em-alta.mock";

export const Route = createFileRoute("/_authenticated/em-alta")({
  head: () => ({
    meta: [
      { title: "Em Alta · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, account_type")
      .eq("user_id", data.user.id)
      .maybeSingle();
    return {
      username: profile?.username ?? data.user.email?.split("@")[0] ?? "voce",
      isCreator: (profile?.account_type ?? "subscriber") === "creator",
    };
  },
  component: EmAltaPage,
});

function EmAltaPage() {
  const { username, isCreator } = Route.useRouteContext();

  return (
    <DashboardShell username={username} isCreator={isCreator}>
      <div className="space-y-8">
        <EmAltaSection title="Top creators">
          {topCreators.map((item, i) => (
            <TopCreatorCard key={item.id} item={item} rank={i + 1} />
          ))}
        </EmAltaSection>

        <EmAltaSection
          title="Ofertas de assinatura"
          icon={<Sparkles className="h-5 w-5 text-primary" />}
        >
          {ofertas.map((item) => (
            <OfertaCard key={item.id} item={item} />
          ))}
        </EmAltaSection>

        <EmAltaSection title="Perfis gratuitos">
          {perfisGratuitos.map((item, i) => (
            <PerfilGratuitoCard key={item.id} item={item} rank={i + 1} />
          ))}
        </EmAltaSection>

        <EmAltaSection title="As mais mimadas">
          {maisMimadas.map((item, i) => (
            <MimadaCard key={item.id} item={item} rank={i + 1} />
          ))}
        </EmAltaSection>

        <EmAltaSection title="Rumo ao topo">
          {rumoAoTopo.map((item, i) => (
            <RumoAoTopoCard key={item.id} item={item} rank={i + 1} />
          ))}
        </EmAltaSection>

        <EmAltaSection title="Em alta nos posts">
          {emAltaNosPosts.map((item, i) => (
            <PostEmAltaCard key={item.id} item={item} rank={i + 1} />
          ))}
        </EmAltaSection>

        <EmAltaSection title="Bombando no chat">
          {bombandoNoChat.map((item, i) => (
            <ChatBombandoCard key={item.id} item={item} rank={i + 1} />
          ))}
        </EmAltaSection>

        <EmAltaSection title="Chamada Um a Um">
          {chamadaUmAUm.map((item, i) => (
            <UmAUmCard key={item.id} item={item} rank={i + 1} />
          ))}
        </EmAltaSection>

        <EmAltaSection title="Live nas alturas">
          {liveNasAlturas.map((item, i) => (
            <LiveCard key={item.id} item={item} rank={i + 1} />
          ))}
        </EmAltaSection>
      </div>
    </DashboardShell>
  );
}
