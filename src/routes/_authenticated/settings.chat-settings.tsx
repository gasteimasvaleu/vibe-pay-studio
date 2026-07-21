import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Lightbulb,
  Image as ImageIcon,
  Mic,
  Smile,
  Tag,
  X,
  Play,
  Pause,
  Square,
  Check,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createChatWelcomeUploadUrl,
  getChatWelcome,
  updateChatWelcome,
  type ChatWelcomeMedia,
} from "@/lib/chat.functions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/settings/chat-settings")({
  head: () => ({
    meta: [
      { title: "Configurações de Chat · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: ChatSettingsPage,
});

const MAX_BYTES = 25 * 1024 * 1024;
const AUDIO_MAX_SEC = 120;
function kindFromMime(mime: string): ChatWelcomeMedia["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "audio";
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function ChatSettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const getFn = useServerFn(getChatWelcome);
  const updateFn = useServerFn(updateChatWelcome);
  const uploadUrlFn = useServerFn(createChatWelcomeUploadUrl);

  const { data, isLoading } = useQuery({
    queryKey: ["chat-welcome"],
    queryFn: () => getFn(),
  });

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<ChatWelcomeMedia[]>([]);
  const [priceCents, setPriceCents] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setMessage(data.message);
    setMedia(data.media);
    setPriceCents(data.priceCents ?? 0);
    setDirty(false);
  }, [data]);

  const markDirty = () => setDirty(true);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          enabled,
          message,
          media: media.map(({ path, mime, kind, durationSec }) => ({
            path,
            mime,
            kind,
            durationSec: durationSec ?? null,
          })),
          tag: null,
          priceCents,
        },
      }),
    onSuccess: () => {
      toast.success("Alterações salvas");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["chat-welcome"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao salvar"),
  });

  async function uploadFile(file: File, kind: ChatWelcomeMedia["kind"], durationSec?: number) {
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo maior que 25MB");
      return;
    }
    setUploading(true);
    try {
      const { path, token } = await uploadUrlFn({
        data: { filename: file.name || `${kind}.bin`, mime: file.type || "application/octet-stream" },
      });
      const { error } = await supabase.storage
        .from("publications")
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (error) throw new Error(error.message);
      const { data: signed } = await supabase.storage
        .from("publications")
        .createSignedUrl(path, 60 * 60);
      setMedia((prev) => [
        ...prev,
        {
          path,
          mime: file.type || "application/octet-stream",
          kind,
          durationSec: durationSec ?? null,
          url: signed?.signedUrl ?? null,
        },
      ]);
      markDirty();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  function onPickFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const mime = f.type || "";
      if (!mime.startsWith("image/") && !mime.startsWith("video/")) {
        toast.error(`Tipo não suportado: ${mime || "desconhecido"}`);
        return;
      }
      uploadFile(f, kindFromMime(mime));
    });
  }

  function removeMedia(i: number) {
    setMedia((prev) => prev.filter((_, idx) => idx !== i));
    markDirty();
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setMessage((m) => m + emoji);
      markDirty();
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = message.slice(0, start) + emoji + message.slice(end);
    setMessage(next);
    markDirty();
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + emoji.length;
    });
  }

  const priceButNoMedia = priceCents > 0 && media.length === 0;
  const canSave =
    dirty &&
    !updateMutation.isPending &&
    !uploading &&
    !priceButNoMedia &&
    (!enabled || message.trim().length >= 3 || media.length > 0);


  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-card">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Configurações de Chat
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200 p-4">
          <Lightbulb className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            Aproveite o primeiro contato para se apresentar e oferecer uma
            mídia exclusiva de boas vindas. A mensagem é enviada automaticamente
            a cada nova assinatura (incluindo renovações).
          </p>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground">
              Habilitar mensagem de boas-vindas
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Sua mensagem é enviada automaticamente aos novos assinantes.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => {
              setEnabled(v);
              markDirty();
            }}
            aria-label="Habilitar mensagem de boas-vindas"
            disabled={isLoading}
          />
        </div>

        {enabled && (
          <div className="rounded-xl bg-muted/60 p-4 space-y-3">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                markDirty();
              }}
              placeholder="Mín. 3 caracteres (ou envie apenas uma mídia)"
              rows={5}
              className="w-full bg-transparent border-0 focus:outline-none resize-none text-foreground placeholder:text-muted-foreground"
            />

            {media.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {media.map((m, i) => (
                  <MediaThumb key={m.path} media={m} onRemove={() => removeMedia(i)} />
                ))}
              </div>
            )}

            {priceCents > 0 && (
              <>
                {media.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Você adicionou precificação, não esqueça de adicionar uma mídia.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setPriceDialogOpen(true)}
                  className="w-full flex items-center justify-between gap-2 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors px-3 py-2.5 text-left"
                >
                  <span className="inline-flex items-center gap-2 text-primary text-sm font-medium">
                    <Tag className="h-4 w-4" />
                    Preço para visualizar
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {formatBRL(priceCents)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Remover preço"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPriceCents(0);
                        markDirty();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setPriceCents(0);
                          markDirty();
                        }
                      }}
                      className="h-5 w-5 grid place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </span>
                </button>
              </>
            )}


            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-1 text-muted-foreground">
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
                <IconButton
                  label="Adicionar imagem/vídeo"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-5 w-5" />
                </IconButton>

                <AudioRecorderButton onRecorded={(file, dur) => uploadFile(file, "audio", dur)} />

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Adicionar um emoji"
                      className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 border-0 w-auto" align="start">
                    <EmojiPicker
                      onEmojiClick={(e) => insertEmoji(e.emoji)}
                      emojiStyle={EmojiStyle.NATIVE}
                      theme={Theme.AUTO}
                      lazyLoadEmojis
                      width={320}
                      height={380}
                    />
                  </PopoverContent>
                </Popover>

                <IconButton
                  label="Precificar mensagem"
                  onClick={() => setPriceDialogOpen(true)}
                >
                  <Tag className="h-5 w-5" />
                </IconButton>


                {uploading && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" /> enviando…
                  </span>
                )}
              </div>
            </TooltipProvider>
          </div>
        )}

        <Button
          type="button"
          onClick={() => updateMutation.mutate()}
          disabled={!canSave}
          className="w-full rounded-md h-12 text-base"
        >
          {updateMutation.isPending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </main>

      <PriceDialog
        open={priceDialogOpen}
        initialCents={priceCents}
        onClose={() => setPriceDialogOpen(false)}
        onSave={(cents) => {
          setPriceCents(cents);
          markDirty();
          setPriceDialogOpen(false);
          if (cents > 0 && media.length === 0) {
            toast.message("Adicione uma mídia para desbloquear a precificação.");
          }
        }}
      />
    </div>
  );
}


function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent hover:text-foreground transition-colors"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function MediaThumb({ media, onRemove }: { media: ChatWelcomeMedia; onRemove: () => void }) {
  return (
    <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-border bg-background group">
      {media.kind === "image" && media.url && (
        <img src={media.url} alt="" className="h-full w-full object-cover" />
      )}
      {media.kind === "video" && media.url && (
        <video src={media.url} className="h-full w-full object-cover" muted />
      )}
      {media.kind === "audio" && (
        <div className="h-full w-full grid place-items-center bg-primary/10 text-primary text-[10px] font-semibold">
          {media.durationSec ? `${Math.round(media.durationSec)}s` : "áudio"}
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remover mídia"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function AudioRecorderButton({
  onRecorded,
}: {
  onRecorded: (file: File, durationSec: number) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const confirm = () => {
    cancelledRef.current = false;
    mediaRef.current?.stop();
  };

  const cancel = () => {
    cancelledRef.current = true;
    mediaRef.current?.stop();
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
        setRecording(false);
        if (cancelledRef.current) {
          chunksRef.current = [];
          return;
        }
        const durationSec = Math.min(
          AUDIO_MAX_SEC,
          Math.max(1, Math.round((Date.now() - startRef.current) / 1000)),
        );
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const ext = (rec.mimeType || "").includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `audio-${Date.now()}.${ext}`, {
          type: blob.type,
        });
        onRecorded(file, durationSec);
      };
      rec.start();
      mediaRef.current = rec;
      startRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        const s = Math.round((Date.now() - startRef.current) / 1000);
        setElapsed(s);
        if (s >= AUDIO_MAX_SEC) confirm();
      }, 250);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível acessar o microfone");
    }
  };

  if (recording) {
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    return (
      <div className="flex items-center gap-1 h-9 px-1.5 rounded-full bg-accent/50">
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancelar gravação"
          className="h-7 w-7 grid place-items-center rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 px-2 text-xs font-medium tabular-nums text-foreground">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
          {mm}:{ss}
        </div>
        <button
          type="button"
          onClick={confirm}
          aria-label="Enviar gravação"
          className="h-7 w-7 grid place-items-center rounded-full text-green-600 hover:bg-green-500/10 transition-colors"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
    );
  }


  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={start}
          aria-label="Gravar um áudio"
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent hover:text-foreground transition-colors"
        >
          <Mic className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Gravar um áudio</TooltipContent>
    </Tooltip>
  );
}

function PriceDialog({
  open,
  initialCents,
  onClose,
  onSave,
}: {
  open: boolean;
  initialCents: number;
  onClose: () => void;
  onSave: (cents: number) => void;
}) {
  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (open) setRaw(initialCents > 0 ? String(initialCents) : "");
  }, [open, initialCents]);

  const cents = useMemo(() => {
    const n = parseInt(raw || "0", 10);
    return Number.isFinite(n) ? Math.min(50000, Math.max(0, n)) : 0;
  }, [raw]);

  const display = useMemo(() => formatBRL(cents), [cents]);
  const valid = cents >= 100 && cents <= 50000;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Precificar mensagem de boas-vindas</DialogTitle>
          <DialogDescription>
            Defina um preço entre R$ 1,00 e R$ 500,00. A mídia enviada junto à
            mensagem ficará bloqueada até o assinante desbloquear no chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="text-sm font-medium text-foreground">Valor</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
              R$
            </span>
            <input
              autoFocus
              inputMode="numeric"
              value={display.replace(/^R\$\s*/, "")}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setRaw(digits);
              }}
              className="w-full h-11 rounded-md border border-border bg-background pl-10 pr-3 text-base font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {!valid && (
            <p className="text-xs text-destructive">
              O preço mínimo é R$ 1,00.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!valid}
            onClick={() => onSave(cents)}
          >
            Salvar preço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Unused import safety
void Play;
void Pause;
