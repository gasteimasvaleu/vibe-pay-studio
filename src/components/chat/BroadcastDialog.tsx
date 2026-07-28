import { useState, useRef } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageIcon, X, Tag, Loader2, Send, Users } from "lucide-react";
import {
  previewBroadcastAudience,
  sendBroadcast,
} from "@/lib/chat-monetization.functions";
import { createChatWelcomeUploadUrl, type ChatWelcomeMedia } from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { PriceDialog } from "@/components/chat/PriceDialog";

type Audience = "all_followers" | "active_subscribers" | "expired_subscribers" | "top_buyers";

const AUDIENCE_LABELS: Record<Audience, string> = {
  all_followers: "Todos os seguidores",
  active_subscribers: "Assinantes ativos",
  expired_subscribers: "Assinantes expirados",
  top_buyers: "Maiores compradores",
};

const MAX_BYTES = 25 * 1024 * 1024;

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function BroadcastDialog({
  open,
  onClose,
  creatorId,
}: {
  open: boolean;
  onClose: () => void;
  creatorId: string;
}) {
  const previewFn = useServerFn(previewBroadcastAudience);
  const sendFn = useServerFn(sendBroadcast);
  const uploadUrlFn = useServerFn(createChatWelcomeUploadUrl);

  const [audience, setAudience] = useState<Audience>("all_followers");
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<ChatWelcomeMedia[]>([]);
  const [priceCents, setPriceCents] = useState(0);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [topN, setTopN] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ["broadcast-preview", audience, topN],
    queryFn: () => previewFn({ data: { filters: [audience], creatorId } }),
    enabled: open,
  });

  const priceButNoMedia = priceCents > 0 && media.length === 0;
  const canSend =
    message.trim().length > 0 &&
    !priceButNoMedia &&
    (preview?.count ?? 0) > 0 &&
    !uploading;

  async function uploadFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo maior que 25MB");
      return;
    }
    const mime = file.type || "application/octet-stream";
    if (!mime.startsWith("image/") && !mime.startsWith("video/")) {
      toast.error("Apenas imagens e vídeos são permitidos");
      return;
    }
    setUploading(true);
    try {
      const { path, token } = await uploadUrlFn({
        data: { filename: file.name || "media.bin", mime },
      });
      const { error } = await supabase.storage
        .from("publications")
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (error) throw new Error(error.message);
      const kind = mime.startsWith("image/") ? "image" : "video";
      setMedia((prev) => [
        ...prev,
        { path, mime, kind, durationSec: null, url: null },
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  function onPickFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => uploadFile(f));
  }

  function removeMedia(i: number) {
    setMedia((prev) => prev.filter((_, idx) => idx !== i));
  }

  const sendMutation = useMutation({
    mutationFn: () =>
      sendFn({
        data: {
          audience,
          message,
          media: media.map(({ path, mime, kind, durationSec }) => ({
            path,
            mime,
            kind,
            durationSec: durationSec ?? null,
          })),
          priceCents,
          topN,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Broadcast enviado: ${res.sent} de ${res.sent + res.failed}`);
      onClose();
      setMessage("");
      setMedia([]);
      setPriceCents(0);
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao enviar broadcast"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Mensagem em massa
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem privada para todos os assinantes ou seguidores de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Público</label>
            <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o público" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AUDIENCE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {audience === "top_buyers" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Quantidade de top compradores</label>
              <input
                type="number"
                min={1}
                max={500}
                value={topN}
                onChange={(e) => setTopN(Math.max(1, Math.min(500, parseInt(e.target.value || "1", 10))))}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">
            <Users className="h-4 w-4 text-muted-foreground" />
            {previewLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span>
                <strong>{preview?.count ?? 0}</strong> destinatários
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva sua mensagem..."
              rows={4}
              className="w-full rounded-md border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          {media.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {media.map((m, i) => (
                <div
                  key={m.path}
                  className="relative h-20 w-20 rounded-lg overflow-hidden border border-border bg-background group"
                >
                  {m.kind === "image" ? (
                    <div className="h-full w-full bg-muted" />
                  ) : (
                    <div className="h-full w-full bg-muted grid place-items-center text-xs text-muted-foreground">
                      vídeo
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remover mídia"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {priceCents > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
              <span className="text-sm font-medium text-primary flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Preço para visualizar
              </span>
              <span className="text-sm font-bold text-foreground">{formatBRL(priceCents)}</span>
            </div>
          )}

          {priceButNoMedia && (
            <p className="text-xs text-destructive">
              Anexe uma mídia para definir um preço.
            </p>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => {
                onPickFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Mídia
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPriceDialogOpen(true)}
            >
              <Tag className="h-4 w-4 mr-2" />
              {priceCents > 0 ? formatBRL(priceCents) : "Preço"}
            </Button>
          </div>
        </div>

        <PriceDialog
          open={priceDialogOpen}
          onOpenChange={setPriceDialogOpen}
          initialCents={priceCents > 0 ? priceCents : null}
          onConfirm={(cents) => setPriceCents(cents ?? 0)}
          title="Definir valor do broadcast"
          description="Cobre pelo conteúdo de mídia anexada. Seguidores só visualizam após pagar."
          allowZero
        />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canSend || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Enviar broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
