import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, X, DollarSign } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { publishStory } from "@/lib/stories.functions";

export function PublishStoryDialog({
  open,
  onOpenChange,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
}) {
  const publish = useServerFn(publishStory);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [priceReais, setPriceReais] = useState("0");
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setCaption("");
    setPriceReais("0");
  };

  const handleFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    if (!file) {
      toast.error("Selecione uma imagem ou vídeo");
      return;
    }
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Formato não suportado");
      return;
    }
    setUploading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) throw new Error("Sessão expirada");
      const ext = (file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg")).toLowerCase();
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("stories")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);

      const priceCents = Math.max(0, Math.round(Number(priceReais.replace(",", ".")) * 100)) || 0;
      await publish({
        data: {
          mediaPath: path,
          mediaType: isVideo ? "video" : "image",
          priceCents,
          caption: caption.trim() || null,
        },
      });
      toast.success("Story publicado!");
      reset();
      onOpenChange(false);
      onPublished();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao publicar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !uploading) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
          <DialogTitle>Publicar story</DialogTitle>
          <DialogDescription>
            Fica visível por 24h para os assinantes que te seguem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[40dvh] sm:max-h-[50vh]">
              {file?.type.startsWith("video/") ? (
                <video src={preview} className="h-full w-full object-contain" controls />
              ) : (
                <img src={preview} alt="preview" className="h-full w-full object-contain" />
              )}
              <button
                type="button"
                onClick={() => handleFile(null)}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 grid place-items-center"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl p-8 cursor-pointer hover:bg-muted/30">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Selecionar imagem ou vídeo</span>
              <span className="text-xs text-muted-foreground">Formato recomendado 9:16</span>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}

          <div className="space-y-2">
            <Label htmlFor="story-caption">Legenda (opcional)</Label>
            <Textarea
              id="story-caption"
              maxLength={280}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Diga algo sobre o story..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="story-price">Preço para desbloquear (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="story-price"
                type="number"
                min={0}
                step="0.01"
                value={priceReais}
                onChange={(e) => setPriceReais(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe em 0 para story gratuito. Assinantes pagam com carteira.
            </p>
          </div>

          <Button
            className="w-full"
            onClick={submit}
            disabled={uploading || !file}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Publicando...
              </>
            ) : (
              "Publicar story"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
