import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhepPlayerProps {
  whepUrl: string | null | undefined;
  hlsUrl?: string | null | undefined;
  objectFit?: "contain" | "cover";
  className?: string;
  muted?: boolean;
  onPlaybackStateChange?: (state: "idle" | "connecting" | "waiting" | "playing" | "error") => void;
}

type PlayerStatus = "idle" | "connecting" | "waiting" | "switching-hls" | "playing" | "error";

const MAX_WHEP_ATTEMPTS_BEFORE_HLS = 6;
const MAX_WHEP_ATTEMPTS = 18;

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

function retryAfterMs(response: Response, attempt: number) {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 15_000);

    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) return Math.min(Math.max(dateMs - Date.now(), 1000), 15_000);
  }

  return Math.min(1000 * 2 ** Math.min(attempt, 4), 15_000);
}

function closePeerConnection(pc: RTCPeerConnection | null) {
  if (!pc) return;
  pc.getSenders().forEach((sender) => sender.track?.stop());
  pc.getReceivers().forEach((receiver) => receiver.track?.stop());
  pc.close();
}

/** Player WebRTC recvonly (WHEP) para Cloudflare Stream com estado + overlay. */
export function WhepPlayer({
  whepUrl,
  hlsUrl,
  objectFit = "contain",
  className,
  muted = true,
  onPlaybackStateChange,
}: WhepPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const hlsCleanupRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [retry, setRetry] = useState(0);
  const [errorMessage, setErrorMessage] = useState("Não foi possível conectar");

  const updateStatus = (next: PlayerStatus) => {
    setStatus(next);
    if (next === "switching-hls") {
      onPlaybackStateChange?.("waiting");
      return;
    }
    onPlaybackStateChange?.(next);
  };

  useEffect(() => {
    if (!whepUrl && !hlsUrl) {
      updateStatus("idle");
      return;
    }

    let cancelled = false;
    let retryTimer: number | undefined;
    updateStatus("connecting");
    setErrorMessage("Não foi possível conectar");

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        retryTimer = window.setTimeout(resolve, ms);
      });

    const startHlsFallback = async () => {
      const video = videoRef.current;
      if (!video || !hlsUrl) return false;

      closePeerConnection(pcRef.current);
      pcRef.current = null;
      hlsCleanupRef.current?.();
      hlsCleanupRef.current = null;
      updateStatus("switching-hls");

      const markPlaying = () => {
        if (cancelled) return;
        video.play().catch(() => {});
        updateStatus("playing");
      };

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.srcObject = null;
        video.src = hlsUrl;
        video.addEventListener("loadedmetadata", markPlaying, { once: true });
        hlsCleanupRef.current = () => {
          video.removeEventListener("loadedmetadata", markPlaying);
          video.removeAttribute("src");
          video.load();
        };
        return true;
      }

      try {
        const HlsModule = await import("hls.js");
        const Hls = HlsModule.default;
        if (!Hls.isSupported()) return false;

        const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, markPlaying);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || cancelled) return;
          console.error("[live-hls]", data);
          setErrorMessage("A transmissão ainda não está disponível");
          updateStatus("error");
          hls.destroy();
        });
        hlsCleanupRef.current = () => hls.destroy();
        return true;
      } catch (error) {
        console.error("[live-hls]", error);
        return false;
      }
    };

    (async () => {
      for (let attempt = 0; !cancelled; attempt += 1) {
        if (!whepUrl) {
          const started = await startHlsFallback();
          if (!started && !cancelled) {
            setErrorMessage("A transmissão ainda não está disponível");
            updateStatus("error");
          }
          return;
        }

        updateStatus(attempt === 0 ? "connecting" : "waiting");

        try {
          closePeerConnection(pcRef.current);
          pcRef.current = null;

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
        });
        pcRef.current = pc;

        // MediaStream vazio, já anexado ao <video>. Tracks são adicionadas conforme chegam.
        const remoteStream = new MediaStream();
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
        }

        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        pc.addEventListener("track", (ev) => {
          if (cancelled) return;
          ev.streams[0]?.getTracks().forEach((t) => {
            if (!remoteStream.getTracks().some((x) => x.id === t.id)) remoteStream.addTrack(t);
          });
          updateStatus("playing");
          videoRef.current?.play().catch(() => {});
        });

        pc.addEventListener("iceconnectionstatechange", () => {
          if (cancelled) return;
          if (pc.iceConnectionState === "failed") {
            setErrorMessage("A conexão da transmissão falhou");
            updateStatus("error");
          }
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Non-trickle ICE: Cloudflare espera o SDP completo antes do POST WHEP.
        await waitForIceGathering(pc, 3500);

        const res = await fetch(whepUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp ?? "",
        });
        if (!res.ok) {
          closePeerConnection(pc);
          pcRef.current = null;

          if (res.status === 409) {
            console.info("[whep] aguardando publicação ativa", { attempt, status: res.status });
            if (attempt >= MAX_WHEP_ATTEMPTS_BEFORE_HLS && hlsUrl) {
              const started = await startHlsFallback();
              if (started) return;
            }

            if (attempt >= MAX_WHEP_ATTEMPTS) {
              setErrorMessage("A transmissão ainda não enviou sinal de vídeo");
              updateStatus("error");
              return;
            }

            await sleep(retryAfterMs(res, attempt));
            continue;
          }

          if (res.status >= 500 && attempt < MAX_WHEP_ATTEMPTS) {
            await sleep(retryAfterMs(res, attempt));
            continue;
          }

          const details = await res.text().catch(() => "");
          throw new Error(`WHEP HTTP ${res.status}${details ? ` — ${details.slice(0, 120)}` : ""}`);
        }

        const answerSdp = await res.text();
        if (cancelled) return;
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
        return;
      } catch (error) {
        console.error("[whep]", error);

        if (hlsUrl) {
          const started = await startHlsFallback();
          if (started) return;
        }

        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível conectar");
          updateStatus("error");
        }
        return;
      }
      }
    })();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      const pc = pcRef.current;
      closePeerConnection(pc);
      pcRef.current = null;
      hlsCleanupRef.current?.();
      hlsCleanupRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [whepUrl, hlsUrl, retry]);

  const waiting = status === "waiting";
  const switchingHls = status === "switching-hls";

  return (
    <div className={cn("relative w-full h-full bg-black", className)}>
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted={muted}
        className={cn("w-full h-full bg-black", objectFit === "cover" ? "object-cover" : "object-contain")}
      />
      {status !== "playing" && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm text-white text-sm">
          {status === "error" ? (
            <div className="text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-400" />
              <p>{errorMessage}</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRetry((r) => r + 1)}
                className="mt-3 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/80 text-center px-6">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              {waiting ? "Aguardando sinal da transmissão…" : switchingHls ? "Preparando reprodução…" : "Conectando…"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
