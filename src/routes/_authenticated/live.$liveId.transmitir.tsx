import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

type TransmissionState =
  | "idle"
  | "getting-media"
  | "creating-offer"
  | "waiting-ice"
  | "posting-whip"
  | "waiting-ice-connect"
  | "live"
  | "permission-blocked"
  | "error";

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs: number) {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") done();
    };

    pc.addEventListener("icegatheringstatechange", check);
    window.setTimeout(done, timeoutMs);
  });
}

async function closePublisher(
  pc: RTCPeerConnection | null,
  stream: MediaStream | null,
  resourceUrl: string | null,
) {
  if (resourceUrl) {
    try {
      await fetch(resourceUrl, { method: "DELETE", keepalive: true });
    } catch (e) {
      console.warn("[whip] DELETE resource failed", e);
    }
  }
  pc?.getSenders().forEach((sender) => sender.track?.stop());
  pc?.close();
  stream?.getTracks().forEach((track) => track.stop());
}

function TransmitirPage() {
  const { liveId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  useDarkSurface();

  const getLiveFn = useServerFn(getLive);
  const endFn = useServerFn(endLive);

  const [whipUrl, setWhipUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [transmissionState, setTransmissionState] = useState<TransmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("Falha ao iniciar transmissão");
  const [retryTick, setRetryTick] = useState(0);
  const [donorsOpen, setDonorsOpen] = useState(false);
  const [liveViewers, setLiveViewers] = useState<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  const resourceUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!whipUrl) return;
    let cancelled = false;
    (async () => {
      const log = (step: string, extra?: unknown) =>
        console.info(`[whip] ${step}`, extra ?? "");

      const inIframe = typeof window !== "undefined" && window.self !== window.top;
      const isSecure = typeof window !== "undefined" && window.isSecureContext;
      const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;
      log("context", { inIframe, isSecure, hasMediaDevices });

      if (!hasMediaDevices || !isSecure) {
        setErrorMessage(
          "Este navegador não pode acessar câmera/microfone (contexto não seguro). Abra em uma nova aba via HTTPS.",
        );
        setTransmissionState("permission-blocked");
        return;
      }

      // Preview iframe do editor não vem com allow="camera; microphone".
      // Detectamos e mostramos CTA para abrir em nova aba antes de disparar o prompt fantasma.
      if (inIframe) {
        try {
          const cam = await navigator.permissions?.query?.({ name: "camera" as PermissionName });
          const mic = await navigator.permissions?.query?.({ name: "microphone" as PermissionName });
          log("permissions", { cam: cam?.state, mic: mic?.state });
          if (cam?.state === "denied" || mic?.state === "denied") {
            setErrorMessage(
              "Este preview não pode acessar câmera/microfone. Abra a transmissão em uma nova aba para autorizar.",
            );
            setTransmissionState("permission-blocked");
            return;
          }
        } catch {
          // Permissions API pode não suportar 'camera'/'microphone' em alguns browsers — seguimos.
        }
      }

      try {
        setTransmissionState("getting-media");

        // Se veio da tela de configuração, reaproveita o MediaStream já autorizado.
        let stream: MediaStream | null = null;
        try {
          const { takeLiveMedia } = await import("@/lib/live-media-handoff");
          const handoff = takeLiveMedia(liveId);
          if (handoff) {
            log("handoff:reused");
            stream = handoff.stream;
          }
        } catch { /* ignore */ }

        if (!stream) {
          log("getUserMedia:start");
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true,
          });
          log("getUserMedia:ok", {
            video: stream.getVideoTracks().length,
            audio: stream.getAudioTracks().length,
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
          bundlePolicy: "max-bundle",
        });
        pcRef.current = pc;

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        const videoTx = pc.addTransceiver("video", { direction: "sendonly" });
        const audioTx = pc.addTransceiver("audio", { direction: "sendonly" });
        if (videoTrack) await videoTx.sender.replaceTrack(videoTrack);
        if (audioTrack) await audioTx.sender.replaceTrack(audioTrack);

        pc.oniceconnectionstatechange = () => {
          log("iceConnectionState", pc.iceConnectionState);
          if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            setConnected(true);
            setTransmissionState("live");
            queryClient.invalidateQueries({ queryKey: ["live-meta", liveId] });
          }
          if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
            setConnected(false);
            setErrorMessage("A conexão de mídia caiu");
            setTransmissionState("error");
          }
        };
        pc.onconnectionstatechange = () => log("connectionState", pc.connectionState);

        setTransmissionState("creating-offer");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        log("localDescription:set");

        setTransmissionState("waiting-ice");
        await waitForIceGathering(pc, 8000);
        log("iceGathering", pc.iceGatheringState);

        setTransmissionState("posting-whip");
        log("POST:start", whipUrl);
        const res = await fetch(whipUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp ?? "",
        });
        log("POST:response", { status: res.status, location: res.headers.get("Location") });

        if (!res.ok) {
          const details = await res.text().catch(() => "");
          console.error("[whip] error body", details);
          throw new Error(
            `WHIP HTTP ${res.status}${details ? ` — ${details.slice(0, 200)}` : ""}`,
          );
        }

        const location = res.headers.get("Location");
        if (location) {
          try {
            resourceUrlRef.current = new URL(location, whipUrl).toString();
          } catch {
            resourceUrlRef.current = location;
          }
        }

        const answer = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answer });
        log("remoteDescription:set");
        setTransmissionState("waiting-ice-connect");
      } catch (e: any) {
        console.error("[whip] fatal", e);
        setConnected(false);

        const name: string = e?.name ?? "";
        let msg = e?.message ?? "Falha ao iniciar transmissão";
        let nextState: TransmissionState = "error";

        if (name === "NotAllowedError") {
          msg = inIframe
            ? "Este preview não pode acessar câmera/microfone. Abra a transmissão em uma nova aba para autorizar."
            : "Permissão negada. Autorize a câmera e o microfone nas configurações do navegador.";
          nextState = inIframe ? "permission-blocked" : "error";
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          msg = "Nenhuma câmera ou microfone disponível neste dispositivo.";
        } else if (name === "NotReadableError") {
          msg = "Câmera/microfone em uso por outro aplicativo. Feche-o e tente de novo.";
        } else if (name === "SecurityError") {
          msg = "Este preview não pode acessar câmera/microfone. Abra em uma nova aba para autorizar.";
          nextState = "permission-blocked";
        }

        setErrorMessage(msg);
        setTransmissionState(nextState);
        if (nextState !== "permission-blocked") toast.error(msg);
      }
    })();
    return () => {
      cancelled = true;
      const pc = pcRef.current;
      const stream = streamRef.current;
      const resource = resourceUrlRef.current;
      pcRef.current = null;
      streamRef.current = null;
      resourceUrlRef.current = null;
      setConnected(false);
      void closePublisher(pc, stream, resource);
    };
  }, [whipUrl, liveId, queryClient, retryTick]);

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

  const status: "live" | "starting" = connected ? "live" : "starting";
  const viewersDisplay = liveViewers ?? meta?.viewersPeak ?? 0;
  const topOverlay = meta && (
    <LiveOverlayTop
      mobile={isMobile}
      username={meta.creator.username}
      displayName={meta.creator.displayName}
      avatarUrl={meta.creator.avatarUrl}
      viewers={viewersDisplay}
      status={status}
      right={
        <button onClick={handleEnd} className="pointer-events-auto h-6 px-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold inline-flex items-center gap-1">
          <Square className="h-3 w-3" /> Encerrar
        </button>
      }
    />
  );

  const openInNewTab = () => {
    try {
      window.open(window.location.href, "_blank", "noopener");
    } catch {
      /* ignore */
    }
  };

  const videoEl = (fit: "cover" | "contain") => (
    <>
      <video ref={videoRef} playsInline autoPlay muted className={`w-full h-full bg-black ${fit === "cover" ? "object-cover" : "object-contain"}`} />
      {transmissionState === "permission-blocked" && (
        <div className="absolute inset-0 z-[7] grid place-items-center bg-black/80 px-6 text-center text-white">
          <div className="max-w-sm space-y-4">
            <p className="text-sm text-white/90">{errorMessage}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={openInNewTab}
                className="h-10 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90"
              >
                Abrir em nova aba
              </button>
              <button
                type="button"
                onClick={() => setRetryTick((n) => n + 1)}
                className="h-9 rounded-full bg-white/10 text-white text-xs font-medium hover:bg-white/20"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}
      {!connected && transmissionState !== "permission-blocked" && (
        <div className="absolute inset-x-4 bottom-5 z-[6] rounded-full bg-black/50 px-4 py-2 text-center text-xs font-semibold text-white backdrop-blur">
          {transmissionState === "getting-media" && "Conectando câmera…"}
          {transmissionState === "creating-offer" && "Preparando WebRTC…"}
          {transmissionState === "waiting-ice" && "Coletando rotas de rede…"}
          {transmissionState === "posting-whip" && "Enviando sinal para Cloudflare…"}
          {transmissionState === "waiting-ice-connect" && "Aguardando conexão de mídia…"}
          {transmissionState === "error" && (errorMessage || "Falha ao iniciar transmissão")}
          {(transmissionState === "idle" || transmissionState === "live") && "Preparando transmissão…"}
        </div>
      )}
    </>
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
            onViewersChange={setLiveViewers}
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
          <LiveChat liveId={liveId} variant="card" className="flex-1 min-h-0" onViewersChange={setLiveViewers} />
        </div>
      </div>
    </div>
  );
}
