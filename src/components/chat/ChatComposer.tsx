import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Camera,
  DollarSign,
  Gift,
  Loader2,
  Lock,
  Megaphone,
  Mic,
  Paperclip,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PriceDialog } from "@/components/chat/PriceDialog";

export type ComposerMedia = {
  path: string;
  mime: string;
  kind: "image" | "video" | "audio";
  durationSec?: number;
  previewUrl: string;
};

export type ComposerSendPayload = {
  text: string;
  media: ComposerMedia[];
  priceCents: number | null;
  replyToId?: string | null;
};

export type ComposerReplyPreview = {
  messageId: string;
  authorLabel: string;
  snippet: string;
};


const FLOAT_EMOJIS = ["❤️", "🔥", "😍", "👏", "😂", "🎉"];

function uuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

async function uploadOne(file: File, userId: string): Promise<ComposerMedia> {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().slice(0, 8);
  const kind: ComposerMedia["kind"] = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : "audio";
  const path = `chat-welcome/${userId}/${Date.now()}-${uuid()}.${ext}`;
  const { error } = await supabase.storage
    .from("publications")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const previewUrl = URL.createObjectURL(file);
  return { path, mime: file.type || "application/octet-stream", kind, previewUrl };
}

export function ChatComposer({
  meId,
  isCreator,
  isSubscriber,
  disabled,
  onSend,
  onFloatEmoji,
  onCallInvite,
  onPaidDmRequest,
  onTip,
  onBroadcast,
  replyingTo,
  onCancelReply,
}: {
  meId: string | null;
  isCreator: boolean;
  isSubscriber?: boolean;
  disabled?: boolean;
  onSend: (payload: ComposerSendPayload) => Promise<void> | void;
  onFloatEmoji: (emoji: string) => void;
  onCallInvite?: () => void;
  onPaidDmRequest?: () => void;
  onTip?: () => void;
  onBroadcast?: () => void;
  replyingTo?: ComposerReplyPreview | null;
  onCancelReply?: () => void;
}) {
  const [text, setText] = useState("");
  const [media, setMedia] = useState<ComposerMedia[]>([]);
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);


  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      for (const m of media) URL.revokeObjectURL(m.previewUrl);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSend =
    !disabled && !sending && !uploading && (text.trim().length > 0 || media.length > 0);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !meId) return;
    const list = Array.from(files).slice(0, 10 - media.length);
    if (list.length === 0) {
      toast.error("Máximo de 10 anexos por mensagem");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await Promise.all(list.map((f) => uploadOne(f, meId)));
      setMedia((prev) => [...prev, ...uploaded]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(idx: number) {
    setMedia((prev) => {
      const item = prev[idx];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend({ text: text.trim(), media, priceCents });
      setText("");
      for (const m of media) URL.revokeObjectURL(m.previewUrl);
      setMedia([]);
      setPriceCents(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    if (recording || !meId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const duration = recordSec;
        setRecordSec(0);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        if (blob.size < 500) return;
        setUploading(true);
        try {
          const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
          const item = await uploadOne(file, meId);
          setMedia((prev) => [...prev, { ...item, durationSec: Math.max(1, duration) }]);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Falha no upload de áudio");
        } finally {
          setUploading(false);
        }
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordSec(0);
      recordTimerRef.current = setInterval(() => setRecordSec((s) => s + 1), 1000);
    } catch {
      toast.error("Permissão do microfone negada");
    }
  }

  function stopRecording() {
    if (!recording) return;
    setRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    try {
      recorderRef.current?.stop();
    } catch {
      // ignore
    }
  }

  return (
    <div className="w-full space-y-2">
      {priceCents ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 font-medium">
            <DollarSign className="h-3 w-3" />
            Mensagem paga · {(priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <button
            type="button"
            onClick={() => setPriceCents(null)}
            className="text-muted-foreground hover:text-foreground underline"
          >
            remover
          </button>
        </div>
      ) : null}

      {media.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card px-3 pt-3">
          {media.map((m, idx) => (
            <div key={m.path} className="relative">
              {m.kind === "image" ? (
                <img
                  src={m.previewUrl}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : m.kind === "video" ? (
                <video src={m.previewUrl} className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="h-16 min-w-[7rem] px-3 rounded-lg bg-primary/10 text-primary text-xs flex items-center justify-center">
                  Áudio {m.durationSec ? `${m.durationSec}s` : ""}
                </div>
              )}
              <button
                type="button"
                onClick={() => removeMedia(idx)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background grid place-items-center"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-white px-4 pt-3 pb-2 shadow-sm">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder={
            recording
              ? `Gravando… ${recordSec}s (solte para enviar)`
              : priceCents
                ? "Escreva a mensagem exclusiva…"
                : "Escreva uma mensagem…"
          }
          rows={1}
          disabled={disabled || recording}
          className="min-h-[40px] max-h-40 resize-none border-0 shadow-none focus-visible:ring-0 px-0 py-1 bg-transparent text-base"
        />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*"
              onChange={(e) => {
                void handleFiles(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*"
              capture="environment"
              onChange={(e) => {
                void handleFiles(e.target.files);
                if (cameraInputRef.current) cameraInputRef.current.value = "";
              }}
            />

            <IconAction
              icon={Paperclip}
              label="Anexar arquivos"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            />
            <IconAction
              icon={Camera}
              label="Câmera"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            />

            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Enviar emoji flutuante"
                  className="h-9 w-9 grid place-items-center rounded-full text-primary hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top" align="start">
                <div className="flex gap-1">
                  {FLOAT_EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        onFloatEmoji(e);
                        setEmojiOpen(false);
                      }}
                      className="h-9 w-9 grid place-items-center rounded-full text-xl hover:bg-accent"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {isCreator ? (
              <>
                <IconAction
                  icon={DollarSign}
                  label={media.length > 0 ? "Definir valor da mensagem" : "Anexe uma mídia para definir preço"}
                  onClick={() => media.length > 0 && setPriceOpen(true)}
                  active={!!priceCents}
                  disabled={media.length === 0}
                />
                <IconAction
                  icon={Video}
                  label="Convite de videochamada"
                  onClick={onCallInvite}
                />
                <IconAction
                  icon={Megaphone}
                  label="Mensagem em massa"
                  onClick={onBroadcast}
                />
              </>
            ) : null}

            {!isCreator && isSubscriber ? (
              <>
                <IconAction
                  icon={Gift}
                  label="Enviar mimo"
                  onClick={onTip}
                />
                <IconAction
                  icon={Lock}
                  label="Pagar para enviar mídia"
                  onClick={onPaidDmRequest}
                />
              </>
            ) : null}

            {uploading ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-1">
                <Loader2 className="h-3 w-3 animate-spin" /> enviando anexo…
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                void startRecording();
              }}
              onPointerUp={stopRecording}
              onPointerLeave={() => {
                if (recording) stopRecording();
              }}
              aria-label={recording ? "Soltar para enviar" : "Gravar áudio (segure)"}
              className={cn(
                "h-9 w-9 grid place-items-center rounded-full transition-colors select-none",
                recording
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "text-primary hover:bg-primary/10",
              )}
            >
              <Mic className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              aria-label="Enviar"
              className={cn(
                "h-9 w-9 grid place-items-center rounded-full transition-all",
                canSend
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "bg-primary/10 text-primary/60 cursor-not-allowed",
              )}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <PriceDialog
        open={priceOpen}
        onOpenChange={setPriceOpen}
        initialCents={priceCents}
        onConfirm={(cents) => setPriceCents(cents)}
      />
    </div>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          disabled={disabled}
          className={cn(
            "h-9 w-9 grid place-items-center rounded-full transition-colors disabled:opacity-40",
            active ? "bg-primary/15 text-primary" : "text-primary hover:bg-primary/10",
          )}
        >
          <Icon className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
