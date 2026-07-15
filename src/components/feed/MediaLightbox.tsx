import { Search, X, Film } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

export function MediaLightbox({ item, onClose, onOpenPost }: Props) {
  const open = item !== null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 border-0 bg-black/95 max-w-none w-screen h-screen sm:rounded-none flex flex-col [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>Visualizar mídia</DialogTitle>
        </VisuallyHidden>

        {item && (
          <>
            {/* Header */}
            <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 text-white">
              <span className="text-sm font-medium">
                {dateFmt.format(new Date(item.published_at))}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 w-9 grid place-items-center rounded-full text-white/90 hover:bg-white/10 transition-colors"
                  aria-label="Buscar"
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
            <div className="flex-1 min-h-0 grid place-items-center px-2">
              {item.type === "video" ? (
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
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 inset-x-0 z-10 flex items-center justify-between gap-3 px-4 py-4 text-white">
              <div className="flex items-center gap-2 text-sm">
                {item.type === "video" && <Film className="h-4 w-4" />}
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
