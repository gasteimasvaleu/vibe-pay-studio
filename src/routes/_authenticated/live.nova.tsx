import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Radio, ArrowLeft, Camera, Mic, ExternalLink, Users, VideoOff } from "lucide-react";
import { startLive } from "@/lib/lives.functions";
import { stashLiveMedia } from "@/lib/live-media-handoff";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/live/nova")({
  head: () => ({
    meta: [
      { title: "Configurações de vídeo · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NovaLivePage,
});

type Device = { deviceId: string; label: string };

function NovaLivePage() {
  const navigate = useNavigate();
  const startFn = useServerFn(startLive);

  const [title, setTitle] = useState("");
  const [priceReais, setPriceReais] = useState("0,00");
  const [followersOnly, setFollowersOnly] = useState(false);
  const [starting, setStarting] = useState(false);

  const [videoDevices, setVideoDevices] = useState<Device[]>([]);
  const [audioDevices, setAudioDevices] = useState<Device[]>([]);
  const [videoId, setVideoId] = useState<string>("");
  const [audioId, setAudioId] = useState<string>("");

  const [mediaError, setMediaError] = useState<string | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const inIframe = useMemo(
    () => typeof window !== "undefined" && window.self !== window.top,
    [],
  );

  async function refreshDevices() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(
        list
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Câmera ${i + 1}` })),
      );
      setAudioDevices(
        list
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microfone ${i + 1}` })),
      );
    } catch {
      /* ignore */
    }
  }

  async function acquire(videoDeviceId?: string, audioDeviceId?: string) {
    setMediaError(null);
    setPermissionBlocked(false);
    try {
      // Para stream anterior antes de abrir novo
      streamRef.current?.getTracks().forEach((t) => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoDeviceId
          ? { deviceId: { exact: videoDeviceId }, width: 1280, height: 720 }
          : { width: 1280, height: 720 },
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      const vTrack = stream.getVideoTracks()[0];
      const aTrack = stream.getAudioTracks()[0];
      const vId = vTrack?.getSettings().deviceId ?? videoDeviceId ?? "";
      const aId = aTrack?.getSettings().deviceId ?? audioDeviceId ?? "";
      if (vId) setVideoId(vId);
      if (aId) setAudioId(aId);

      await refreshDevices();
      setReady(true);
    } catch (e: any) {
      const name: string = e?.name ?? "";
      let msg = e?.message ?? "Não foi possível acessar a câmera.";
      if (name === "NotAllowedError") {
        msg = inIframe
          ? "Este preview não pode acessar câmera/microfone. Abra em uma nova aba para autorizar."
          : "Permissão negada. Autorize câmera e microfone no navegador.";
        setPermissionBlocked(true);
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        msg = "Nenhuma câmera ou microfone disponível.";
      } else if (name === "NotReadableError") {
        msg = "Câmera/microfone em uso por outro aplicativo.";
      }
      setMediaError(msg);
    }
  }

  // Solicita permissão ao abrir a página
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError("Este navegador não suporta acesso à câmera.");
      return;
    }
    acquire();
    return () => {
      // Só encerra se ainda não foi handed-off para a tela de transmissão
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleVideoChange(id: string) {
    setVideoId(id);
    acquire(id, audioId || undefined);
  }
  function handleAudioChange(id: string) {
    setAudioId(id);
    acquire(videoId || undefined, id);
  }

  async function handleStart() {
    if (!streamRef.current) {
      toast.error("Autorize câmera e microfone antes de iniciar.");
      return;
    }
    const priceCents = Math.round(
      Number(priceReais.replace(",", ".").replace(/[^0-9.]/g, "")) * 100,
    );
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      toast.error("Valor inválido");
      return;
    }
    setStarting(true);
    try {
      const res = await startFn({
        data: { title, priceCents, followersOnly },
      });
      // Passa o stream já autorizado para a tela de transmissão
      stashLiveMedia({
        liveId: res.liveId,
        stream: streamRef.current!,
        videoDeviceId: videoId || undefined,
        audioDeviceId: audioId || undefined,
      });
      // Zera a ref local para o cleanup não parar os tracks
      streamRef.current = null;
      navigate({ to: "/live/$liveId/transmitir", params: { liveId: res.liveId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao iniciar live");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background text-foreground">
      <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between px-4 md:px-6">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">Configurações de vídeo</h1>
          <span className="w-9" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PREVIEW */}
          <div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="h-full w-full object-cover"
              />
              {!ready && !mediaError && (
                <div className="absolute inset-0 grid place-items-center text-white/80 text-sm">
                  Solicitando acesso à câmera…
                </div>
              )}
              {mediaError && (
                <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
                  <div className="max-w-sm space-y-3">
                    <VideoOff className="h-8 w-8 mx-auto text-white/70" />
                    <p className="text-sm text-white">{mediaError}</p>
                    {permissionBlocked && inIframe && (
                      <a
                        href={typeof window !== "undefined" ? window.location.href : "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white text-black text-sm font-semibold"
                      >
                        <ExternalLink className="h-4 w-4" /> Abrir em nova aba
                      </a>
                    )}
                    <button
                      onClick={() => acquire(videoId || undefined, audioId || undefined)}
                      className="block mx-auto text-xs text-white/80 underline"
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-center">
              Toque nas configurações para alterar a câmera e o microfone
            </p>
          </div>

          {/* SETTINGS */}
          <div className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                <Camera className="h-3.5 w-3.5" /> Câmera utilizada
              </label>
              <select
                value={videoId}
                onChange={(e) => handleVideoChange(e.target.value)}
                disabled={!ready || videoDevices.length === 0}
                className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm disabled:opacity-60"
              >
                {videoDevices.length === 0 && <option value="">Nenhuma câmera detectada</option>}
                {videoDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                <Mic className="h-3.5 w-3.5" /> Microfone utilizado
              </label>
              <select
                value={audioId}
                onChange={(e) => handleAudioChange(e.target.value)}
                disabled={!ready || audioDevices.length === 0}
                className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm disabled:opacity-60"
              >
                {audioDevices.length === 0 && <option value="">Nenhum microfone detectado</option>}
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="h-9 w-9 grid place-items-center rounded-full bg-fuchsia-500/10 text-fuchsia-500">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Live só para seguidores</p>
                  <p className="text-xs text-muted-foreground">
                    Apenas quem segue você poderá assistir.
                  </p>
                </div>
              </div>
              <Switch checked={followersOnly} onCheckedChange={setFollowersOnly} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">
                Título da live
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Bate-papo especial"
                maxLength={120}
                className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">
                Valor do ticket (R$)
              </label>
              <input
                value={priceReais}
                onChange={(e) => setPriceReais(e.target.value)}
                inputMode="decimal"
                className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Use 0,00 para live gratuita. Comissão da plataforma: 15%.
              </p>
            </div>

            <button
              onClick={handleStart}
              disabled={starting || !ready}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold shadow-lg shadow-fuchsia-500/30 hover:opacity-95 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              <Radio className="h-5 w-5" />
              {starting ? "Iniciando…" : "Iniciar transmissão"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
