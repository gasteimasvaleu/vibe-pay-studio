import { useEffect, useState } from "react";
import { Search, X, Film } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { GridMediaItem } from "@/lib/publications.functions";

type Props = {
  item: GridMediaItem | null;
  onClose: () => void;
  onOpenPost: (publicationId: string) => void;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const ZOOM_STEPS = [1, 1.5, 2, 3] as const;

export function MediaLightbox({ item, onClose, onOpenPost }: Props) {
  const open = item !== null;
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [item?.id]);

  const isVideo = item?.type === "video";
  const nextZoom = () => {
    const idx = ZOOM_STEPS.indexOf(zoom as (typeof ZOOM_STEPS)[number]);
    const next = ZOOM_STEPS[(idx + 1) % ZOOM_STEPS.length];
    setZoom(next);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 border-0 bg-black/95 max-w-none w-screen h-screen sm:rounded-none flex flex-col [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>Visualizar mídia</DialogTitle>
          <DialogDescription>
            Mídia em tela cheia com opção de zoom e ação para abrir o post relacionado.
          </DialogDescription>
        </VisuallyHidden>

        {item && (
          <>
            {/* Header */}
            <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 text-white">
              <span className="text-sm font-medium">
                {dateFmt.format(new Date(item.published_at))}
              </span>
              <div className="flex items-center gap-2">
                {zoom > 1 && !isVideo && (
                  <span className="text-xs font-semibold text-white/90 tabular-nums">
                    {zoom}x
                  </span>
                )}
                <button
                  type="button"
                  onClick={nextZoom}
                  disabled={isVideo}
                  className="h-9 w-9 grid place-items-center rounded-full text-white/90 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  aria-label={isVideo ? "Zoom indisponível para vídeo" : `Zoom (${zoom}x)`}
                  title={isVideo ? "Zoom indisponível para vídeo" : `Zoom (${zoom}x)`}
                >
                  <Search className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 w-9 grid place-items-center rounded-full text-white/90 hover:bg-white/10 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Media */}
            <div className="flex-1 min-h-0 overflow-auto grid place-items-center px-2">
              {isVideo ? (
                <video
                  src={item.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <img
                  src={item.url}
                  alt=""
                  onClick={nextZoom}
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: "transform 200ms ease",
                    cursor: zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1] ? "zoom-out" : "zoom-in",
                  }}
                  className="max-h-full max-w-full object-contain select-none"
                />
              )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 inset-x-0 z-10 flex items-center justify-between gap-3 px-4 py-4 text-white">
              <div className="flex items-center gap-2 text-sm">
                {isVideo && <Film className="h-4 w-4" />}
                <span>R$ 0,00 Mimos • 0 like</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenPost(item.publication_id)}
                className="rounded-full bg-white text-black px-5 py-2.5 text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Abrir post
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
