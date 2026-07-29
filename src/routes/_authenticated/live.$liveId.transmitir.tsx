import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Square, ArrowLeft, Camera, ExternalLink, Mic, Radio, RefreshCcw, VideoOff } from "lucide-react";
import { getLive, endLive, pingLive } from "@/lib/lives.functions";
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
  | "media-ready"
  | "creating-offer"
  | "waiting-ice"
  | "posting-whip"
  | "waiting-ice-connect"
  | "live"
  | "permission-blocked"
  | "error";

type Device = { deviceId: string; label: string };

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

async function closePeerConnection(pc: RTCPeerConnection | null, resourceUrl: string | null) {
  if (resourceUrl) {
    try {
      await fetch(resourceUrl, { method: "DELETE", keepalive: true });
    } catch (e) {
      console.warn("[whip] DELETE resource failed", e);
    }
  }
  pc?.close();
}

function TransmitirPage() {
  const { liveId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  useDarkSurface();

  const getLiveFn = useServerFn(getLive);
  const endFn = useServerFn(endLive);
  const pingFn = useServerFn(pingLive);

  const [whipUrl, setWhipUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [transmissionState, setTransmissionState] = useState<TransmissionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("Falha ao iniciar transmissão");
  const [mediaReady, setMediaReady] = useState(false);
  const [videoDevices, setVideoDevices] = useState<Device[]>([]);
  const [audioDevices, setAudioDevices] = useState<Device[]>([]);
  const [videoId, setVideoId] = useState("");
  const [audioId, setAudioId] = useState("");
  const [autoStarted, setAutoStarted] = useState(false);
  const [donorsOpen, setDonorsOpen] = useState(false);
  const [liveViewers, setLiveViewers] = useState<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const drag = useLiveDragChat();
  const resourceUrlRef = useRef<string | null>(null);

  const inIframe = useMemo(
    () => typeof window !== "undefined" && window.self !== window.top,
    [],
  );

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

  const attachStream = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    const nextVideoId = videoTrack?.getSettings().deviceId;
    const nextAudioId = audioTrack?.getSettings().deviceId;
    if (nextVideoId) setVideoId(nextVideoId);
    if (nextAudioId) setAudioId(nextAudioId);

    setMediaReady(true);
    setTransmissionState("media-ready");
    setErrorMessage("");
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(
        list
          .filter((device) => device.kind === "videoinput")
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Câmera ${index + 1}`,
          })),
      );
      setAudioDevices(
        list
          .filter((device) => device.kind === "audioinput")
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Microfone ${index + 1}`,
          })),
      );
    } catch {
      /* device labels can stay empty until permission is granted */
    }
  }, []);

  const acquireMedia = useCallback(async (videoDeviceId?: string, audioDeviceId?: string) => {
    const isSecure = typeof window !== "undefined" && window.isSecureContext;
    const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;

    if (!hasMediaDevices || !isSecure) {
      setErrorMessage("Este navegador não pode acessar câmera/microfone. Abra a transmissão em uma nova aba via HTTPS.");
      setTransmissionState("permission-blocked");
      return null;
    }

    setConnected(false);
    setMediaReady(false);
    setTransmissionState("getting-media");
    setErrorMessage("");

    try {
      await closePeerConnection(pcRef.current, resourceUrlRef.current);
      pcRef.current = null;
      resourceUrlRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoDeviceId
          ? { deviceId: { exact: videoDeviceId }, width: 1280, height: 720 }
          : { width: 1280, height: 720 },
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      });

      attachStream(stream);
      await refreshDevices();
      return stream;
    } catch (e: any) {
      const name: string = e?.name ?? "";
      let msg = e?.message ?? "Não foi possível acessar câmera/microfone.";
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

      setMediaReady(false);
      setErrorMessage(msg);
      setTransmissionState(nextState);
      if (nextState !== "permission-blocked") toast.error(msg);
      return null;
    }
  }, [attachStream, inIframe, refreshDevices]);

  const publishStream = useCallback(async (stream: MediaStream) => {
    if (!whipUrl) {
      setErrorMessage("A live ainda não recebeu a URL de transmissão da Cloudflare.");
      setTransmissionState("error");
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== "live") {
      setErrorMessage("A câmera não está ativa. Autorize novamente antes de iniciar a live.");
      setTransmissionState("error");
      setMediaReady(false);
      return;
    }

    try {
      const log = (step: string, extra?: unknown) =>
        console.info(`[whip] ${step}`, extra ?? "");

      setConnected(false);
      setErrorMessage("");
      await closePeerConnection(pcRef.current, resourceUrlRef.current);
      pcRef.current = null;
      resourceUrlRef.current = null;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
        bundlePolicy: "max-bundle",
      });
      pcRef.current = pc;

      const audioTrack = stream.getAudioTracks()[0];
      const videoTx = pc.addTransceiver("video", { direction: "sendonly" });
      await videoTx.sender.replaceTrack(videoTrack);
      const audioTx = pc.addTransceiver("audio", { direction: "sendonly" });
      if (audioTrack && audioTrack.readyState === "live") {
        await audioTx.sender.replaceTrack(audioTrack);
      }

      const markLive = () => {
        setConnected(true);
        setTransmissionState("live");
        queryClient.invalidateQueries({ queryKey: ["live-meta", liveId] });
      };

      pc.oniceconnectionstatechange = () => {
        log("iceConnectionState", pc.iceConnectionState);
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          markLive();
        }
        if (pc.iceConnectionState === "failed") {
          setConnected(false);
          setErrorMessage("A conexão de mídia falhou. Tente iniciar novamente.");
          setTransmissionState("error");
        }
      };
      pc.onconnectionstatechange = () => {
        log("connectionState", pc.connectionState);
        if (pc.connectionState === "connected") markLive();
        if (pc.connectionState === "failed") {
          setConnected(false);
          setErrorMessage("A conexão com a Cloudflare falhou. Tente iniciar novamente.");
          setTransmissionState("error");
        }
      };

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
        throw new Error(`WHIP HTTP ${res.status}${details ? ` — ${details.slice(0, 200)}` : ""}`);
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
      const msg = e?.message ?? "Falha ao enviar sinal para a Cloudflare.";
      setConnected(false);
      setErrorMessage(msg);
      setTransmissionState("error");
      toast.error(msg);
    }
  }, [liveId, queryClient, whipUrl]);

  useEffect(() => {
    if (!whipUrl || autoStarted) return;
    (async () => {
      try {
        const { takeLiveMedia } = await import("@/lib/live-media-handoff");
        const handoff = takeLiveMedia(liveId);
        if (!handoff) {
          setAutoStarted(true);
          await refreshDevices();
          return;
        }
        setAutoStarted(true);
        attachStream(handoff.stream);
        setVideoId(handoff.videoDeviceId ?? "");
        setAudioId(handoff.audioDeviceId ?? "");
        await refreshDevices();
        await publishStream(handoff.stream);
      } catch (e: any) {
        setAutoStarted(true);
        setErrorMessage(e?.message ?? "Falha ao recuperar a câmera autorizada.");
        setTransmissionState("error");
      }
    })();
  }, [attachStream, autoStarted, liveId, publishStream, refreshDevices, whipUrl]);

  useEffect(() => {
    return () => {
      const pc = pcRef.current;
      const stream = streamRef.current;
      const resource = resourceUrlRef.current;
      pcRef.current = null;
      streamRef.current = null;
      resourceUrlRef.current = null;
      setConnected(false);
      void closePublisher(pc, stream, resource);
    };
  }, []);

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

  const handleVideoChange = (id: string) => {
    setVideoId(id);
    acquireMedia(id, audioId || undefined);
  };

  const handleAudioChange = (id: string) => {
    setAudioId(id);
    acquireMedia(videoId || undefined, id);
  };

  const handleStartPublishing = async () => {
    const stream = streamRef.current ?? await acquireMedia(videoId || undefined, audioId || undefined);
    if (!stream) return;
    await publishStream(stream);
  };

  const isPublishing = ["creating-offer", "waiting-ice", "posting-whip", "waiting-ice-connect"].includes(transmissionState);
  const needsSetup = !connected && !isPublishing;

  const setupOverlay = (
    <div className="absolute inset-0 z-[8] grid place-items-center bg-black/70 px-4 text-white backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950/90 p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-fuchsia-500/20 text-fuchsia-300">
            {transmissionState === "error" || transmissionState === "permission-blocked" ? <VideoOff className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-bold">Preparar transmissão</p>
            <p className="text-xs text-white/60">O público só verá a live depois que o sinal for enviado.</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-100">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-white/70">
            <span className="mb-1.5 flex items-center gap-2"><Camera className="h-3.5 w-3.5" /> Câmera</span>
            <select
              value={videoId}
              onChange={(event) => handleVideoChange(event.target.value)}
              disabled={isPublishing || videoDevices.length === 0}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white outline-none disabled:opacity-50"
            >
              {videoDevices.length === 0 && <option value="">Autorize para detectar câmera</option>}
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId} className="bg-neutral-950">
                  {device.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-white/70">
            <span className="mb-1.5 flex items-center gap-2"><Mic className="h-3.5 w-3.5" /> Microfone</span>
            <select
              value={audioId}
              onChange={(event) => handleAudioChange(event.target.value)}
              disabled={isPublishing || audioDevices.length === 0}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white outline-none disabled:opacity-50"
            >
              {audioDevices.length === 0 && <option value="">Autorize para detectar microfone</option>}
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId} className="bg-neutral-950">
                  {device.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {transmissionState === "permission-blocked" && inIframe ? (
            <button
              type="button"
              onClick={openInNewTab}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90"
            >
              <ExternalLink className="h-4 w-4" /> Abrir em nova aba
            </button>
          ) : mediaReady ? (
            <button
              type="button"
              onClick={handleStartPublishing}
              disabled={isPublishing || !whipUrl}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-fuchsia-600 text-sm font-bold text-white hover:bg-fuchsia-500 disabled:opacity-60"
            >
              <Radio className="h-4 w-4" /> Iniciar transmissão
            </button>
          ) : (
            <button
              type="button"
              onClick={() => acquireMedia(videoId || undefined, audioId || undefined)}
              disabled={transmissionState === "getting-media"}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              {transmissionState === "getting-media" ? "Solicitando permissão…" : "Autorizar câmera e microfone"}
            </button>
          )}

          {(mediaReady || transmissionState === "error") && (
            <button
              type="button"
              onClick={() => acquireMedia(videoId || undefined, audioId || undefined)}
              disabled={transmissionState === "getting-media" || isPublishing}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Trocar/reativar câmera
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const videoEl = (fit: "cover" | "contain") => (
    <>
      <video ref={videoRef} playsInline autoPlay muted className={`w-full h-full bg-black ${fit === "cover" ? "object-cover" : "object-contain"}`} />
      {needsSetup && setupOverlay}
      {!connected && isPublishing && (
        <div className="absolute inset-x-4 bottom-5 z-[6] rounded-full bg-black/50 px-4 py-2 text-center text-xs font-semibold text-white backdrop-blur">
          {transmissionState === "creating-offer" && "Preparando WebRTC…"}
          {transmissionState === "waiting-ice" && "Coletando rotas de rede…"}
          {transmissionState === "posting-whip" && "Enviando sinal para Cloudflare…"}
          {transmissionState === "waiting-ice-connect" && "Aguardando conexão de mídia…"}
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate({ to: "/dashboard" })} className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground">
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
    </div>
  );
}
