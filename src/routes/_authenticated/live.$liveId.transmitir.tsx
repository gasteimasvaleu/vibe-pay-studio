import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Square, ArrowLeft } from "lucide-react";
import { getLive, endLive } from "@/lib/lives.functions";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDarkSurface } from "@/hooks/useDarkSurface";
import { LiveChat } from "@/components/live/LiveChat";
import { LiveDonorsPanel } from "@/components/live/LiveDonorsPanel";
import { LiveOverlayTop } from "@/components/live/LiveOverlayTop";
import { useLiveDragChat } from "@/components/live/useLiveDragChat";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/live/$liveId/transmitir")({
  head: () => ({
    meta: [{ title: "Transmitindo · Monetisexy" }, { name: "robots", content: "noindex" }],
  }),
  component: TransmitirPage,
});

function TransmitirPage() {
  const { liveId } = Route.useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  useDarkSurface();

  const getLiveFn = useServerFn(getLive);
  const endFn = useServerFn(endLive);

  const [whipUrl, setWhipUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [donorsOpen, setDonorsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const drag = useLiveDragChat();

  const { data: meta } = useQuery({
    queryKey: ["live-meta", liveId],
    queryFn: () => getLiveFn({ data: { liveId } }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("cf_webrtc_url")
        .eq("id", liveId)
        .maybeSingle();
      setWhipUrl((data as any)?.cf_webrtc_url ?? null);
    })();
  }, [liveId]);

  useEffect(() => {
    if (!whipUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") setConnected(true);
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await new Promise<void>((r) => {
          if (pc.iceGatheringState === "complete") return r();
          const c = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", c); r(); } };
          pc.addEventListener("icegatheringstatechange", c);
          setTimeout(r, 2500);
        });
        const res = await fetch(whipUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp ?? "",
        });
        if (!res.ok) throw new Error(`WHIP HTTP ${res.status}`);
        const answer = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answer });
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Falha ao iniciar transmissão");
      }
    })();
    return () => {
      cancelled = true;
      const pc = pcRef.current;
      if (pc) {
        pc.getSenders().forEach((s) => s.track?.stop());
        pc.close();
      }
    };
  }, [whipUrl]);

  async function handleEnd() {
    if (!confirm("Encerrar a transmissão?")) return;
    try {
      await endFn({ data: { liveId } });
      toast.success("Live encerrada");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao encerrar");
    }
  }

  const status: "live" | "scheduled" = connected ? "live" : "scheduled";
  const topOverlay = meta && (
    <LiveOverlayTop
      mobile={isMobile}
      username={meta.creator.username}
      displayName={meta.creator.displayName}
      avatarUrl={meta.creator.avatarUrl}
      viewers={meta.viewersPeak}
      status={status}
      right={
        <button onClick={handleEnd} className="pointer-events-auto h-6 px-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold inline-flex items-center gap-1">
          <Square className="h-3 w-3" /> Encerrar
        </button>
      }
    />
  );

  const videoEl = (fit: "cover" | "contain") => (
    <video ref={videoRef} playsInline autoPlay muted className={`w-full h-full bg-black ${fit === "cover" ? "object-cover" : "object-contain"}`} />
  );

  // MOBILE
  if (isMobile) {
    return (
      <div ref={drag.containerRef} className="relative h-dvh bg-black overflow-hidden">
        <div className="absolute inset-0">{videoEl("cover")}</div>

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

        <div className="absolute inset-x-0 bottom-0 z-10" style={{ height: `${drag.chatRatio * 100}%` }}>
          <LiveChat
            liveId={liveId}
            broadcasterId={meta?.creator ? undefined : undefined}
            variant="overlay"
            className="h-full rounded-t-2xl"
            headerSlot={
              <div {...drag.dragHandlers} className="touch-none cursor-row-resize flex items-center justify-center py-2 border-b border-white/15">
                <div className="h-1 w-10 rounded-full bg-white/40" />
              </div>
            }
          />
        </div>

        <Sheet open={donorsOpen} onOpenChange={setDonorsOpen}>
          <SheetContent side="bottom" className="bg-neutral-950 text-white border-white/10 max-h-[70dvh]">
            <SheetHeader><SheetTitle className="text-white">Top apoiadores</SheetTitle></SheetHeader>
            <LiveDonorsPanel liveId={liveId} variant="sheet" className="text-foreground bg-card mt-3 rounded-lg" />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // DESKTOP
  return (
    <div className="container max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate({ to: "/dashboard" })} className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button onClick={handleEnd} className="h-9 px-3 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold inline-flex items-center gap-1.5">
          <Square className="h-3.5 w-3.5" /> Encerrar transmissão
        </button>
      </div>
      <div className="flex gap-4 h-[calc(100vh-9rem)]">
        <div className="relative flex-1 bg-black rounded-lg overflow-hidden">
          {videoEl("contain")}
          {topOverlay}
        </div>
        <div className="w-[340px] h-full flex flex-col gap-3">
          <LiveDonorsPanel liveId={liveId} variant="card" collapsible className="shrink-0" />
          <LiveChat liveId={liveId} variant="card" className="flex-1 min-h-0" />
        </div>
      </div>
    </div>
  );
}
