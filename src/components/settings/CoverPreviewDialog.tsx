import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { updateCoverUrl } from "@/lib/profile.functions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const BUCKET = "covers";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

type Props = {
  coverDataUrl: string;
  avatarUrl: string | null;
  displayName: string;
  onCancel: () => void;
  onReplaceCover: () => void;
  onSuccess: (coverUrl: string) => void;
};

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function CoverPreviewDialog({
  coverDataUrl,
  avatarUrl,
  displayName,
  onCancel,
  onReplaceCover,
  onSuccess,
}: Props) {
  const [saving, setSaving] = useState(false);
  const saveCover = useServerFn(updateCoverUrl);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const blob = await dataUrlToBlob(coverDataUrl);
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
      await saveCover({ data: { coverUrl: signed.signedUrl } });
      toast.success("Foto de capa atualizada");
      onSuccess(signed.signedUrl);
    } catch (err) {
      toast.error((err as Error).message ?? "não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <DialogContent className="max-w-3xl rounded-3xl border-0 bg-card p-6 md:p-8 shadow-2xl">
        <DialogTitle className="text-lg font-bold text-foreground">
          Pré-visualização
        </DialogTitle>

        <div className="mt-4 relative">
          <button
            type="button"
            onClick={onReplaceCover}
            disabled={saving}
            className="relative block w-full aspect-[3/1] rounded-xl overflow-hidden bg-muted"
            aria-label="Trocar foto de capa"
          >
            <img
              src={coverDataUrl}
              alt="Prévia da capa"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-0 grid place-items-center">
              <span className="h-11 w-11 rounded-full bg-black/60 text-white grid place-items-center">
                <Camera className="h-5 w-5" />
              </span>
            </span>
          </button>

          <div className="absolute -bottom-8 left-4">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-card">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {displayName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full px-8"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
