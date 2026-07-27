import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, RefreshCcw } from "lucide-react";

interface WhepPlayerProps {
  whepUrl: string | null | undefined;
  objectFit?: "contain" | "cover";
  className?: string;
  muted?: boolean;
}

/** Player WebRTC recvonly (WHEP) para Cloudflare Stream com estado + overlay. */
export function WhepPlayer({ whepUrl, objectFit = "contain", className, muted = true }: WhepPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "playing" | "error">("idle");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!whepUrl) { setStatus("idle"); return; }
    let cancelled = false;
    setStatus("connecting");

    (async () => {
      try {
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
          setStatus("playing");
          videoRef.current?.play().catch(() => {});
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Non-trickle ICE: aguarda gathering completar (ou 2s)
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") return resolve();
          const check = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", check);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", check);
          setTimeout(resolve, 2000);
        });

        const res = await fetch(whepUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp ?? "",
        });
        if (!res.ok) throw new Error(`WHEP ${res.status}`);
        const answerSdp = await res.text();
        if (cancelled) return;
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (e) {
        console.error("[whep]", e);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      const pc = pcRef.current;
      if (pc) {
        pc.getSenders().forEach((s) => s.track?.stop());
        pc.close();
      }
      pcRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [whepUrl, retry]);

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
              <p>Não foi possível conectar</p>
              <button
                onClick={() => setRetry((r) => r + 1)}
                className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Tentar novamente
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/80">
              <Loader2 className="h-4 w-4 animate-spin" /> Conectando…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
