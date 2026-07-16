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
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { updateAvatarUrl } from "@/lib/profile.functions";

const BUCKET = "avatars";
// Signed URL válida por ~10 anos — bucket é privado.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;
const OUTPUT_SIZE = 512;

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onSuccess: (avatarUrl: string) => void;
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

async function getCroppedBlob(
  imageSrc: string,
  area: Area,
  rotation: number,
  flip: boolean,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const rad = (rotation * Math.PI) / 180;

  // Canvas intermediário com a imagem inteira aplicando rotação + flip.
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

  // Recorta o crop final e reduz para OUTPUT_SIZE.
  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("canvas unavailable");
  octx.drawImage(
    stage,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise((resolve, reject) => {
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("falha ao gerar imagem"))),
      "image/jpeg",
      0.9,
    );
  });
}

export function AvatarCropDialog({ imageSrc, onCancel, onSuccess }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const saveAvatar = useServerFn(updateAvatarUrl);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setArea(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!area || saving) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, area, rotation, flip);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("sessão expirada");
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw new Error(upErr.message);
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr || !signed) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error(signErr?.message ?? "falha ao gerar URL");
      }
      await saveAvatar({ data: { avatarUrl: signed.signedUrl } });
      toast.success("Foto de perfil atualizada");
      onSuccess(signed.signedUrl);
    } catch (err) {
      toast.error((err as Error).message ?? "não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col">
      {/* Top bar */}
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

      {/* Cropper */}
      <div className="relative flex-1 bg-neutral-500">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-center gap-4 py-6 bg-black">
        <div className="flex items-center gap-4 rounded-full bg-neutral-800 px-4 py-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Cancelar"
            className="h-10 w-10 grid place-items-center rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !area}
            aria-label="Confirmar"
            className="h-10 w-10 grid place-items-center rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
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
