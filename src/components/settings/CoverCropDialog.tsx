import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Check,
  RotateCw,
  RotateCcw,
  FlipHorizontal2,
  ZoomIn,
  ZoomOut,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const OUTPUT_W = 1500;
const OUTPUT_H = 500;
const ASPECT = OUTPUT_W / OUTPUT_H;

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (dataUrl: string) => void;
};

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

async function getCroppedDataUrl(
  imageSrc: string,
  area: Area,
  rotation: number,
  flip: boolean,
): Promise<string> {
  const image = await loadImage(imageSrc);
  const rad = (rotation * Math.PI) / 180;
  const bBoxW =
    Math.abs(Math.cos(rad) * image.width) + Math.abs(Math.sin(rad) * image.height);
  const bBoxH =
    Math.abs(Math.sin(rad) * image.width) + Math.abs(Math.cos(rad) * image.height);

  const stage = document.createElement("canvas");
  stage.width = bBoxW;
  stage.height = bBoxH;
  const sctx = stage.getContext("2d");
  if (!sctx) throw new Error("canvas unavailable");
  sctx.translate(bBoxW / 2, bBoxH / 2);
  sctx.rotate(rad);
  sctx.scale(flip ? -1 : 1, 1);
  sctx.translate(-image.width / 2, -image.height / 2);
  sctx.drawImage(image, 0, 0);

  const out = document.createElement("canvas");
  out.width = OUTPUT_W;
  out.height = OUTPUT_H;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("canvas unavailable");
  octx.drawImage(stage, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_W, OUTPUT_H);
  return out.toDataURL("image/jpeg", 0.9);
}

export function CoverCropDialog({ imageSrc, onCancel, onCropped }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!area || busy) return;
    setBusy(true);
    try {
      const url = await getCroppedDataUrl(imageSrc, area, rotation, flip);
      onCropped(url);
    } catch (err) {
      toast.error((err as Error).message ?? "falha ao recortar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col">
      <div className="flex items-start justify-between px-6 pt-5 pb-3 gap-4">
        <div className="flex items-start gap-6">
          <ToolButton
            icon={<ZoomIn className="h-5 w-5" />}
            label="Mais zoom"
            onClick={() => setZoom((z) => Math.min(z + 0.2, 5))}
          />
          <ToolButton
            icon={<ZoomOut className="h-5 w-5" />}
            label="Menos zoom"
            onClick={() => setZoom((z) => Math.max(z - 0.2, 1))}
          />
        </div>
        <div className="flex items-start gap-6">
          <ToolButton
            icon={<FlipHorizontal2 className="h-5 w-5" />}
            label="Girar horizontal"
            onClick={() => setFlip((f) => !f)}
          />
          <ToolButton
            icon={<RotateCw className="h-5 w-5" />}
            label="Girar direita"
            onClick={() => setRotation((r) => r + 90)}
          />
          <ToolButton
            icon={<RotateCcw className="h-5 w-5" />}
            label="Girar esquerda"
            onClick={() => setRotation((r) => r - 90)}
          />
        </div>
      </div>

      <div className="relative flex-1 bg-neutral-500">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={ASPECT}
          cropShape="rect"
          showGrid={false}
          objectFit="horizontal-cover"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="flex items-center justify-center gap-4 py-6 bg-black">
        <div className="flex items-center gap-4 rounded-full bg-neutral-800 px-4 py-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Cancelar"
            className="h-10 w-10 grid place-items-center rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !area}
            aria-label="Confirmar"
            className="h-10 w-10 grid place-items-center rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 text-white group"
    >
      <span className="h-11 w-11 grid place-items-center rounded-full bg-neutral-800 group-hover:bg-neutral-700 transition-colors">
        {icon}
      </span>
      <span className="text-xs text-white/80">{label}</span>
    </button>
  );
}
