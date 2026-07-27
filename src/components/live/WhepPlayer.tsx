import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface WhepPlayerProps {
  whepUrl: string | null | undefined;
  objectFit?: "contain" | "cover";
  className?: string;
  muted?: boolean;
}

/** Player WebRTC recvonly (WHEP) para Cloudflare Stream. */
export function WhepPlayer({ whepUrl, objectFit = "contain", className, muted = false }: WhepPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!whepUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });
        pc.ontrack = (ev) => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && ev.streams[0]) {
            v.srcObject = ev.streams[0];
            v.play().catch(() => {});
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await new Promise<void>((r) => {
          if (pc.iceGatheringState === "complete") return r();
          const c = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", c); r(); } };
          pc.addEventListener("icegatheringstatechange", c);
          setTimeout(r, 2500);
        });
        const res = await fetch(whepUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp ?? "",
        });
        if (!res.ok) throw new Error(`WHEP HTTP ${res.status}`);
        const answer = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answer });
      } catch (e) {
        console.error("[whep] falha", e);
      }
    })();

    return () => {
      cancelled = true;
      pcRef.current?.getReceivers().forEach((r) => r.track?.stop());
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [whepUrl]);

  return (
    <video
      ref={videoRef}
      playsInline
      autoPlay
      muted={muted}
      className={cn(objectFit === "cover" ? "object-cover" : "object-contain", "bg-black", className)}
    />
  );
}
