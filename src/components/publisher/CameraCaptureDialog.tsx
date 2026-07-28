import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Video, RefreshCw, Circle, Square, Check, RotateCcw, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export type CameraMode = "photo" | "video";
export type CameraAccept = "image" | "video" | "both";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accept: CameraAccept;
  multi?: boolean; // se true, permite tirar várias fotos antes de confirmar
  maxVideoSeconds?: number;
  onCapture: (files: File[]) => void;
};

type PendingItem = {
  id: string;
  file: File;
  url: string;
  kind: "image" | "video";
};

function pickVideoMimeType(): string | undefined {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  accept,
  multi = false,
  maxVideoSeconds = 60,
  onCapture,
}: Props) {
  const allowPhoto = accept === "image" || accept === "both";
  const allowVideo = accept === "video" || accept === "both";
  const [mode, setMode] = useState<CameraMode>(allowPhoto ? "photo" : "video");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [items, setItems] = useState<PendingItem[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const stopStream = useCallback(() => {
    try {
      recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
    setElapsed(0);
  }, []);

  const startStream = useCallback(async () => {
    setError(null);
    setReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador não suporta acesso à câmera.");
      return;
    }
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
        audio: mode === "video",
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao acessar a câmera";
      const friendly = /permission|denied|NotAllowed/i.test(msg)
        ? "Permissão negada. Habilite a câmera nas configurações do navegador."
        : /NotFound|Devices/i.test(msg)
          ? "Nenhuma câmera encontrada neste dispositivo."
          : msg;
      setError(friendly);
    }
  }, [facing, mode, stopStream]);

  // Start/stop when dialog open changes
  useEffect(() => {
    if (open) {
      void startStream();
    } else {
      stopStream();
      // limpar itens ao fechar
      items.forEach((it) => URL.revokeObjectURL(it.url));
      setItems([]);
    }
    return () => {
      if (!open) return;
      // cleanup on unmount when open
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reagir a troca de modo/câmera
  useEffect(() => {
    if (!open) return;
    void startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, mode]);

  const handleTakePhoto = () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    const track = stream.getVideoTracks()[0];
    const settings = track?.getSettings();
    const w = settings?.width ?? video.videoWidth ?? 1280;
    const h = settings?.height ?? video.videoHeight ?? 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Não foi possível capturar a foto");
          return;
        }
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        setItems((prev) => {
          if (!multi) {
            prev.forEach((it) => URL.revokeObjectURL(it.url));
            return [{ id: crypto.randomUUID(), file, url, kind: "image" }];
          }
          return [...prev, { id: crypto.randomUUID(), file, url, kind: "image" }];
        });
      },
      "image/jpeg",
      0.92,
    );
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickVideoMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (err) {
      toast.error("Gravação de vídeo não suportada neste navegador");
      return;
    }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || "video/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      const file = new File([blob], `video-${Date.now()}.${ext}`, { type });
      const url = URL.createObjectURL(blob);
      setItems((prev) => {
        prev.forEach((it) => URL.revokeObjectURL(it.url));
        return [{ id: crypto.randomUUID(), file, url, kind: "video" }];
      });
      setRecording(false);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
    setElapsed(0);
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(s);
      if (s >= maxVideoSeconds) {
        stopRecording();
      }
    }, 250);
  };

  const stopRecording = () => {
    try {
      recorderRef.current?.state === "recording" && recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const confirm = () => {
    if (items.length === 0) return;
    onCapture(items.map((it) => it.file));
    // Não revogar aqui — os arquivos serão consumidos; URLs de preview podem ficar até o dialog fechar
    setItems([]);
    onOpenChange(false);
  };

  const canFlip = true; // sempre expõe o botão; alguns dispositivos ignoram
  const showPreview = !multi && items.length === 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) stopStream();
        onOpenChange(v);
      }}
    >
      <DialogContent className="p-0 max-w-2xl bg-black text-white border-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-white">Câmera</DialogTitle>
          <DialogDescription className="text-white/60">
            Capture uma foto ou grave um vídeo com sua câmera.
          </DialogDescription>
        </DialogHeader>

        {/* Abas Foto/Vídeo */}
        {allowPhoto && allowVideo && (
          <div className="px-4 flex gap-2">
            <button
              type="button"
              onClick={() => !recording && setMode("photo")}
              disabled={recording}
              className={`flex-1 h-9 rounded-md text-sm font-medium transition ${
                mode === "photo" ? "bg-white text-black" : "bg-white/10 text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2 justify-center"><Camera className="h-4 w-4" />Foto</span>
            </button>
            <button
              type="button"
              onClick={() => !recording && setMode("video")}
              disabled={recording}
              className={`flex-1 h-9 rounded-md text-sm font-medium transition ${
                mode === "video" ? "bg-white text-black" : "bg-white/10 text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2 justify-center"><Video className="h-4 w-4" />Vídeo</span>
            </button>
          </div>
        )}

        {/* Viewport */}
        <div className="relative mx-4 mt-3 aspect-video bg-black/60 rounded-md overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
              <p className="text-sm">{error}</p>
              <Button size="sm" variant="secondary" onClick={() => void startStream()}>
                Tentar novamente
              </Button>
            </div>
          ) : showPreview ? (
            items[0].kind === "image" ? (
              <img src={items[0].url} alt="prévia" className="w-full h-full object-contain bg-black" />
            ) : (
              <video src={items[0].url} controls className="w-full h-full object-contain bg-black" />
            )
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                  Iniciando câmera…
                </div>
              )}
              {recording && (
                <div className="absolute top-2 left-2 inline-flex items-center gap-2 rounded-full bg-red-600/90 px-2 py-1 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  REC {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
                  {String(elapsed % 60).padStart(2, "0")}
                </div>
              )}
            </>
          )}
        </div>

        {/* Miniaturas (modo múltiplo) */}
        {multi && items.length > 0 && (
          <div className="px-4 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {items.map((it) => (
              <div key={it.id} className="relative shrink-0">
                {it.kind === "image" ? (
                  <img src={it.url} alt="" className="h-16 w-16 rounded object-cover" />
                ) : (
                  <video src={it.url} className="h-16 w-16 rounded object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-black/80 border border-white/30 grid place-items-center"
                  aria-label="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Controles */}
        <div className="p-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            disabled={!ready || recording || !canFlip}
            className="text-white hover:bg-white/10"
            aria-label="Girar câmera"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>

          {showPreview ? (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  items.forEach((it) => URL.revokeObjectURL(it.url));
                  setItems([]);
                }}
                className="gap-1"
              >
                <RotateCcw className="h-4 w-4" /> Refazer
              </Button>
              <Button onClick={confirm} className="gap-1 bg-primary text-primary-foreground">
                <Check className="h-4 w-4" /> Usar
              </Button>
            </div>
          ) : mode === "photo" ? (
            <button
              type="button"
              onClick={handleTakePhoto}
              disabled={!ready}
              className="h-16 w-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 disabled:opacity-40 grid place-items-center"
              aria-label="Tirar foto"
            >
              <span className="h-12 w-12 rounded-full bg-white" />
            </button>
          ) : recording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="h-16 w-16 rounded-full border-4 border-white bg-red-600 grid place-items-center"
              aria-label="Parar gravação"
            >
              <Square className="h-6 w-6 fill-white text-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={!ready}
              className="h-16 w-16 rounded-full border-4 border-white bg-red-600/70 hover:bg-red-600 disabled:opacity-40 grid place-items-center"
              aria-label="Gravar vídeo"
            >
              <Circle className="h-6 w-6 fill-white text-white" />
            </button>
          )}

          {multi && items.length > 0 ? (
            <Button onClick={confirm} className="gap-1 bg-primary text-primary-foreground">
              <Check className="h-4 w-4" /> Usar ({items.length})
            </Button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
