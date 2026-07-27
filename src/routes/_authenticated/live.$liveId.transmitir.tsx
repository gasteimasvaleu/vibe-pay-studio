import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio, Square, Users, ArrowLeft } from "lucide-react";
import { getLive, endLive } from "@/lib/lives.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/live/$liveId/transmitir")({
  head: () => ({
    meta: [{ title: "Transmitindo · Monetisexy" }, { name: "robots", content: "noindex" }],
  }),
  component: TransmitirPage,
});

/**
 * Broadcaster do lado do criador.
 * Usa WHIP (WebRTC-HTTP Ingest Protocol) da Cloudflare Stream para publicar
 * a câmera direto do navegador.
 */
function TransmitirPage() {
  const { liveId } = Route.useParams();
  const navigate = useNavigate();
  const getLiveFn = useServerFn(getLive);
  const endFn = useServerFn(endLive);

  const [whipUrl, setWhipUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // Busca a URL WHIP direto do banco (só o dono pode ler cf_webrtc_url via RLS UPDATE gate, então usamos servidor).
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("cf_webrtc_url, total_views")
        .eq("id", liveId)
        .maybeSingle();
      setWhipUrl((data as any)?.cf_webrtc_url ?? null);
      setViewers((data as any)?.total_views ?? 0);
    })();
  }, [liveId]);

  // Inicia captura + WHIP handshake
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
          if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            setConnected(true);
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        // Aguarda ICE completar (Cloudflare aceita non-trickle)
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") return resolve();
          const check = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", check); resolve(); } };
          pc.addEventListener("icegatheringstatechange", check);
          setTimeout(resolve, 2500);
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

  // Poll para viewers/likes
  const { data: meta } = useQuery({
    queryKey: ["live-meta", liveId],
    queryFn: () => getLiveFn({ data: { liveId } }),
    refetchInterval: 5000,
  });

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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <button onClick={() => navigate({ to: "/dashboard" })} className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11px] font-bold ${connected ? "bg-emerald-500 text-white" : "bg-white/20"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {connected ? "AO VIVO" : "Conectando…"}
          </span>
          <span className="text-xs text-white/70 inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {meta?.viewersPeak ?? viewers}</span>
        </div>
        <button onClick={handleEnd} className="h-9 px-3 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold inline-flex items-center gap-1.5">
          <Square className="h-3.5 w-3.5" /> Encerrar
        </button>
      </header>

      <div className="flex-1 grid place-items-center bg-black">
        <video ref={videoRef} playsInline muted autoPlay className="w-full max-w-3xl aspect-video object-cover rounded-xl border border-white/10" />
      </div>

      <footer className="p-4 border-t border-white/10 text-center text-xs text-white/60">
        <p><Radio className="inline h-3.5 w-3.5 mr-1" /> Transmissão via Cloudflare Stream · WebRTC baixa latência</p>
      </footer>
    </div>
  );
}
