import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Lock, Users as UsersIcon } from "lucide-react";
import { getLive, registerLiveView } from "@/lib/lives.functions";
import { supabase } from "@/integrations/supabase/client";
import { LiveTicketDialog } from "@/components/live/LiveTicketDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDarkSurface } from "@/hooks/useDarkSurface";
import { WhepPlayer } from "@/components/live/WhepPlayer";
import { LiveChat } from "@/components/live/LiveChat";
import { LiveDonorsPanel } from "@/components/live/LiveDonorsPanel";
import { LiveOverlayTop } from "@/components/live/LiveOverlayTop";
import { useLiveDragChat } from "@/components/live/useLiveDragChat";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/live/$liveId/")({
  head: () => ({
    meta: [{ title: "Live · Monetisexy" }, { name: "robots", content: "noindex" }],
  }),
  component: LiveViewerPage,
});

function LiveViewerPage() {
  const { liveId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  useDarkSurface();

  const getLiveFn = useServerFn(getLive);
  const registerViewFn = useServerFn(registerLiveView);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [donorsOpen, setDonorsOpen] = useState(false);
  const [playbackState, setPlaybackState] = useState<"idle" | "connecting" | "waiting" | "playing" | "error">("idle");


  const { data: live, refetch } = useQuery({
    queryKey: ["live", liveId],
    queryFn: () => getLiveFn({ data: { liveId } }),
    refetchInterval: (query) => {
      const l: any = query.state.data;
      if (!l) return 5_000;
      if (l.status === "ended") return false;
      // Enquanto a live está no ar mas o whepUrl ainda não foi resolvido
      // (o vídeo do publisher ainda não apareceu na CF), sondagem rápida.
      if (l.status === "live" && l.canWatch && !l.whepUrl) return 3_000;
      return 15_000;
    },
  });


  // Dono nunca fica na tela de espectador — vai direto para a transmissão.
  useEffect(() => {
    if (live?.isOwner) {
      navigate({ to: "/live/$liveId/transmitir", params: { liveId }, replace: true });
    }
  }, [live?.isOwner, liveId, navigate]);

  useEffect(() => {
    if (live?.canWatch) registerViewFn({ data: { liveId } }).catch(() => {});
  }, [live?.canWatch, liveId, registerViewFn]);

  useEffect(() => {
    const ch = supabase
      .channel(`live-${liveId}-status`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${liveId}` },
        (p: any) => {
          if (p.new?.status === "ended") toast.info("A live foi encerrada");
          qc.invalidateQueries({ queryKey: ["live", liveId] });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [liveId, qc]);



  const drag = useLiveDragChat();
  const [liveViewers, setLiveViewers] = useState<number | null>(null);

  if (!live) return <div className="min-h-screen bg-background grid place-items-center text-muted-foreground text-sm">Carregando…</div>;

  const viewersDisplay = liveViewers ?? live.viewersPeak;

  const topOverlay = (
    <LiveOverlayTop
      mobile={isMobile}
      username={live.creator.username}
      displayName={live.creator.displayName}
      avatarUrl={live.creator.avatarUrl}
      viewers={viewersDisplay}
      status={live.status === "live" && live.canWatch ? (playbackState === "playing" ? "live" : "starting") : live.status}
    />
  );

  const playerOrPaywall = (fit: "cover" | "contain") => {
    if (live.status === "ended") {
      return <div className="w-full h-full grid place-items-center text-white/70 text-sm">Esta live foi encerrada.</div>;
    }
    if (live.canWatch) {
      return (
        <WhepPlayer
          whepUrl={live.whepUrl}
          hlsUrl={live.hlsUrl}
          objectFit={fit}
          className="w-full h-full"
          onPlaybackStateChange={setPlaybackState}
        />
      );
    }
    return (
      <div className="w-full h-full grid place-items-center p-6">
        <div className="text-center max-w-sm bg-black/50 backdrop-blur rounded-2xl p-6 text-white">
          <div className="h-14 w-14 mx-auto rounded-full bg-white/10 grid place-items-center mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold">{live.title ?? "Live paga"}</h2>
          {live.description && <p className="text-sm text-white/70 mt-1">{live.description}</p>}
          <p className="text-2xl font-bold mt-4">R$ {(live.priceCents / 100).toFixed(2).replace(".", ",")}</p>
          <button
            onClick={() => setTicketOpen(true)}
            className="mt-4 w-full h-11 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold shadow-lg shadow-fuchsia-500/30"
          >
            Comprar acesso
          </button>

          <p className="text-[11px] text-white/50 mt-2">Ticket único vale enquanto a live estiver no ar.</p>
        </div>
      </div>
    );
  };

  // ------- MOBILE -------
  if (isMobile) {
    return (
      <div ref={drag.containerRef} className="fixed inset-0 bg-black overflow-hidden z-40">
        <div className="absolute inset-0">
          {playerOrPaywall("cover")}
        </div>

        {/* área tocável sobre o vídeo para abrir doadores */}
        <button
          type="button"
          aria-label="Ver top apoiadores"
          className="absolute inset-x-0 top-0 z-[5]"
          style={{ bottom: `${drag.chatRatio * 100}%` }}
          onClick={() => setDonorsOpen(true)}
        />

        {topOverlay}

        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="absolute z-20 h-9 w-9 grid place-items-center rounded-full bg-black/45 backdrop-blur text-white hover:bg-black/60"
          style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)", left: "0.75rem" }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div
          className="absolute inset-x-0 bottom-0 z-10"
          style={{ height: `${drag.chatRatio * 100}%` }}
        >
          <LiveChat
            liveId={liveId}
            broadcasterId={undefined}
            variant="overlay"
            className="h-full rounded-t-2xl"
            onViewersChange={setLiveViewers}
            headerSlot={
              <div
                {...drag.dragHandlers}
                className="touch-none cursor-row-resize flex items-center justify-center py-2 border-b border-white/15"
              >
                <div className="h-1 w-10 rounded-full bg-white/40" />
              </div>
            }
          />
        </div>

        <Sheet open={donorsOpen} onOpenChange={setDonorsOpen}>
          <SheetContent side="bottom" className="bg-neutral-950 text-white border-white/10 max-h-[70dvh]">
            <SheetHeader>
              <SheetTitle className="text-white">Top apoiadores</SheetTitle>
            </SheetHeader>
            <LiveDonorsPanel liveId={liveId} variant="sheet" className="text-foreground bg-card mt-3 rounded-lg" />
          </SheetContent>
        </Sheet>

        <LiveTicketDialog
          open={ticketOpen}
          onOpenChange={setTicketOpen}
          liveId={liveId}
          creatorName={live.creator.displayName ?? live.creator.username}
          priceCents={live.priceCents}
          onPaid={() => refetch()}
        />
      </div>
    );
  }


  // ------- DESKTOP -------
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate({ to: "/dashboard" })} className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="inline-flex items-center gap-1 text-muted-foreground text-xs">
          <UsersIcon className="h-3.5 w-3.5" /> {viewersDisplay}
        </div>
      </div>
      <div className="flex gap-4 h-[calc(100vh-9rem)]">
        <div className="relative flex-1 bg-black rounded-lg overflow-hidden">
          {playerOrPaywall("contain")}
          {topOverlay}
        </div>
        <div className="w-[340px] h-full flex flex-col gap-3">
          <LiveDonorsPanel liveId={liveId} variant="card" collapsible className="shrink-0" />
          <LiveChat liveId={liveId} variant="card" className="flex-1 min-h-0" onViewersChange={setLiveViewers} />
        </div>
      </div>

      <LiveTicketDialog
        open={ticketOpen}
        onOpenChange={setTicketOpen}
        liveId={liveId}
        creatorName={live.creator.displayName ?? live.creator.username}
        priceCents={live.priceCents}
        onPaid={() => refetch()}
      />
      </div>
    </div>
  );

}
