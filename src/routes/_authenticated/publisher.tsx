import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { flushSync } from "react-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowLeftRight,
  Ban,
  Calendar as CalendarIcon,
  Camera,
  Check,
  Clock,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  Lock,
  Minus,
  Mic,
  Pin,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import {
  createPublication,
  deleteDraftMedia,
} from "@/lib/publications.functions";

export const Route = createFileRoute("/_authenticated/publisher")({
  head: () => ({
    meta: [
      { title: "Nova publicação" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublisherPage,
});

const BUCKET = "publications";
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://zyoxtptkmhugxmdzmptd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b3h0cHRrbWh1Z3htZHptcHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTU5NjgsImV4cCI6MjA5OTA5MTk2OH0.JCvkcYD89lRDfvNB5_G03xUqt0K50fFFutHKBvlS_lM";
// Signed URL de longa duração (1 ano) — bucket é privado.
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 365;
const MAX_MEDIA = 10;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

type MediaStatus = "uploading" | "ready" | "error";
type MediaItem = {
  id: string;
  previewUrl: string;
  type: "image" | "video";
  status: MediaStatus;
  storagePath?: string;
  publicUrl?: string;
  uploadProgress: number;
  error?: string;
};

type Toggles = {
  paid: { enabled: boolean; priceCents: number | null };
  challenge: { enabled: boolean; priceCents: number | null };
  expires24h: boolean;
  schedule: { enabled: boolean; at: string | null };
  commentsDisabled: boolean;
  pinnedToTop: boolean;
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function getStorageUploadUrl(path: string) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodedPath}`;
}

function uploadWithProgress({
  file,
  path,
  token,
  onProgress,
}: {
  file: File;
  path: string;
  token: string;
  onProgress: (progress: number) => void;
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", getStorageUploadUrl(path));
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onerror = () => reject(new Error("Falha de conexão no upload"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        reject(new Error(parsed.message ?? parsed.error ?? "Falha no upload"));
      } catch {
        reject(new Error(xhr.responseText || "Falha no upload"));
      }
    };

    xhr.send(file);
  });
}

function PublisherPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState("");
  const [toggles, setToggles] = useState<Toggles>({
    paid: { enabled: false, priceCents: null },
    challenge: { enabled: false, priceCents: null },
    expires24h: false,
    schedule: { enabled: false, at: null },
    commentsDisabled: false,
    pinnedToTop: false,
  });
  const [reorderMode, setReorderMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [paidOpen, setPaidOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const createFn = useServerFn(createPublication);
  const deleteDraft = useServerFn(deleteDraftMedia);
  const mutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      toast.success("Publicação criada!");
      router.navigate({ to: "/feed" });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    },
  });

  const uploadingCount = media.filter((m) => m.status === "uploading").length;
  const errorCount = media.filter((m) => m.status === "error").length;
  const uploadProgress =
    media.length > 0
      ? Math.round(
          media.reduce((total, item) => total + item.uploadProgress, 0) /
            media.length,
        )
      : 0;
  const canContinue =
    media.length > 0 && uploadingCount === 0 && errorCount === 0;

  const goBack = () => {
    if (step === 2) return setStep(1);
    router.history.back();
  };

  const openPicker = () => setPickerOpen(true);
  const triggerFileInput = () => {
    // IMPORTANTE: clicar sincronamente para preservar o user-gesture,
    // senão navegadores bloqueiam a abertura do diálogo de arquivos.
    flushSync(() => setPickerOpen(false));
    fileInputRef.current?.click();
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;

    const sessionRes = await supabase.auth.getSession();
    const session = sessionRes.data.session;
    const userId = session?.user.id;
    const token = session?.access_token;
    if (!userId || !token) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    const remaining = MAX_MEDIA - media.length;
    const slice = selectedFiles.slice(0, remaining);

    const uploadJobs: Array<{ id: string; file: File; path: string }> = [];
    const newItems: MediaItem[] = slice.flatMap((file) => {
      const isVideo = file.type.startsWith("video");
      const type: "image" | "video" = isVideo ? "video" : "image";
      const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > limit) {
        toast.error(
          `${file.name} excede o limite de ${isVideo ? "200MB" : "15MB"}`,
        );
        return [];
      }
      const id = crypto.randomUUID();
      const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const path = `posts/${userId}/drafts/${id}.${ext}`;
      uploadJobs.push({ id, file, path });
      const item: MediaItem = {
        id,
        previewUrl: URL.createObjectURL(file),
        type,
        status: "uploading",
        uploadProgress: 0,
      };
      return [item];
    });

    if (newItems.length === 0) return;
    setMedia((m) => [...m, ...newItems]);

    for (const { id, file, path } of uploadJobs) {
      void uploadWithProgress({
        file,
        path,
        token,
        onProgress: (progress) => {
          setMedia((prev) =>
            prev.map((m) => (m.id === id ? { ...m, uploadProgress: progress } : m)),
          );
        },
      })
        .then(async () => {
          const { data: signed, error: signErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, SIGNED_URL_EXPIRES_IN);
          if (signErr || !signed) {
            setMedia((prev) =>
              prev.map((m) =>
                m.id === id
                  ? {
                      ...m,
                      status: "error",
                      uploadProgress: 100,
                      error: signErr?.message ?? "Falha ao gerar URL assinada",
                    }
                  : m,
              ),
            );
            toast.error(`Falha ao preparar ${file.name}`);
            return;
          }
          setMedia((prev) =>
            prev.map((m) =>
              m.id === id
                ? {
                    ...m,
                    status: "ready",
                    storagePath: path,
                    publicUrl: signed.signedUrl,
                    uploadProgress: 100,
                  }
                : m,
            ),
          );
        })
        .catch((error: unknown) => {
          setMedia((prev) =>
            prev.map((m) =>
              m.id === id
                ? {
                    ...m,
                    status: "error",
                    uploadProgress: 100,
                    error: error instanceof Error ? error.message : "Falha no upload",
                  }
                : m,
            ),
          );
          toast.error(`Falha ao enviar ${file.name}`);
        });
    }
  };

  const removeMedia = async (id: string) => {
    const item = media.find((m) => m.id === id);
    setMedia((m) => m.filter((x) => x.id !== id));
    if (item?.storagePath) {
      try {
        await deleteDraft({ data: { storagePath: item.storagePath } });
      } catch {
        // silencioso: arquivo órfão pode ser limpo depois.
      }
    }
    if (item) URL.revokeObjectURL(item.previewUrl);
  };

  const onPost = () => {
    const readyMedia = media.filter((m) => m.status === "ready" && m.storagePath && m.publicUrl);
    if (readyMedia.length === 0) return;
    const visibility: "public" | "paid" | "challenge" = toggles.paid.enabled
      ? "paid"
      : toggles.challenge.enabled
        ? "challenge"
        : "public";
    mutation.mutate({
      data: {
        caption: caption.trim() || null,
        visibility,
        priceCents: toggles.paid.priceCents,
        challengeCents: toggles.challenge.priceCents,
        expires24h: toggles.expires24h,
        scheduledAt: toggles.schedule.at,
        commentsDisabled: toggles.commentsDisabled,
        pinned: toggles.pinnedToTop,
        media: readyMedia.map((m) => ({
          storagePath: m.storagePath!,
          url: m.publicUrl!,
          type: m.type,
        })),
      },
    });
  };

  // Handlers for switches
  const onPaidChange = (v: boolean) => {
    if (v) setPaidOpen(true);
    else setToggles((t) => ({ ...t, paid: { enabled: false, priceCents: null } }));
  };
  const onChallengeChange = (v: boolean) => {
    if (v) setChallengeOpen(true);
    else
      setToggles((t) => ({
        ...t,
        challenge: { enabled: false, priceCents: null },
      }));
  };
  const onScheduleChange = (v: boolean) => {
    if (v) setScheduleOpen(true);
    else setToggles((t) => ({ ...t, schedule: { enabled: false, at: null } }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto h-14 px-4 flex items-center">
          <button
            onClick={goBack}
            aria-label="Voltar"
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold text-foreground truncate pr-9">
            {step === 1 ? "Enviando mídia" : "Criando publicação"}
          </h1>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 pb-40">
        {step === 1 ? (
          <StepMedia
            media={media}
            onOpenPicker={openPicker}
            onRemove={removeMedia}
            reorderMode={reorderMode}
            setReorderMode={setReorderMode}
            setMedia={setMedia}
          />
        ) : (
          <StepCompose
            media={media}
            caption={caption}
            setCaption={setCaption}
            toggles={toggles}
            onPaidChange={onPaidChange}
            onChallengeChange={onChallengeChange}
            onScheduleChange={onScheduleChange}
            setToggles={setToggles}
            setMedia={setMedia}
            reorderMode={reorderMode}
            setReorderMode={setReorderMode}
          />
        )}
      </main>

      <footer className="fixed bottom-16 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {step === 1 ? (
            <div className="space-y-3">
              {uploadingCount > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Enviando mídia</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}
              <Button
                className="w-full h-12 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold disabled:opacity-40 disabled:bg-muted disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
                disabled={!canContinue}
                onClick={() => setStep(2)}
              >
                {uploadingCount > 0
                  ? `Enviando (${uploadingCount})...`
                  : "Continuar"}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full h-12 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-pink-400 hover:opacity-95 text-white font-semibold disabled:opacity-50"
              disabled={mutation.isPending || !canContinue}
              onClick={onPost}
            >
              {mutation.isPending ? "Postando..." : "Postar"}
            </Button>
          )}
        </div>
      </footer>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl sm:max-w-[420px] sm:mx-auto sm:left-0 sm:right-0"
        >
          <SheetHeader>
            <SheetTitle>Selecionar mídia</SheetTitle>
          </SheetHeader>
          <div className="grid gap-3 py-4">
            <PickerOption
              icon={<ImageIcon className="h-5 w-5" />}
              label="Biblioteca do dispositivo"
              onClick={triggerFileInput}
            />
            <PickerOption
              icon={<FolderPlus className="h-5 w-5" />}
              label="Acervo no Monetisexy"
              onClick={triggerFileInput}
            />
            <PickerOption
              icon={<Camera className="h-5 w-5" />}
              label="Câmera"
              onClick={triggerFileInput}
            />
          </div>
        </SheetContent>
      </Sheet>

      <PriceDialog
        open={paidOpen}
        onOpenChange={(v) => {
          setPaidOpen(v);
          if (!v && !toggles.paid.enabled) {
            setToggles((t) => ({
              ...t,
              paid: { enabled: false, priceCents: null },
            }));
          }
        }}
        title="Desbloquear publicação"
        subtitle={null}
        minCents={1490}
        maxCents={200000}
        initialCents={toggles.paid.priceCents ?? 1490}
        onConfirm={(cents) => {
          setToggles((t) => ({
            ...t,
            paid: { enabled: true, priceCents: cents },
            challenge: { enabled: false, priceCents: null },
          }));
          setPaidOpen(false);
        }}
      />

      <PriceDialog
        open={challengeOpen}
        onOpenChange={(v) => {
          setChallengeOpen(v);
          if (!v && !toggles.challenge.enabled) {
            setToggles((t) => ({
              ...t,
              challenge: { enabled: false, priceCents: null },
            }));
          }
        }}
        title="Desafio"
        subtitle="Valor do desafio"
        minCents={5000}
        maxCents={200000}
        initialCents={toggles.challenge.priceCents ?? 5000}
        onConfirm={(cents) => {
          setToggles((t) => ({
            ...t,
            challenge: { enabled: true, priceCents: cents },
            paid: { enabled: false, priceCents: null },
          }));
          setChallengeOpen(false);
        }}
      />

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={(v) => {
          setScheduleOpen(v);
          if (!v && !toggles.schedule.enabled) {
            setToggles((t) => ({ ...t, schedule: { enabled: false, at: null } }));
          }
        }}
        initial={toggles.schedule.at}
        onConfirm={(iso) => {
          setToggles((t) => ({ ...t, schedule: { enabled: true, at: iso } }));
          setScheduleOpen(false);
        }}
      />
    </div>
  );
}

function PickerOption({
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
      className="w-full flex items-center gap-3 px-4 py-4 rounded-full bg-muted hover:bg-muted/80 transition-colors text-left"
    >
      <span className="text-foreground">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

/* ---------------- STEP 1 ---------------- */

function StepMedia({
  media,
  onOpenPicker,
  onRemove,
  reorderMode,
  setReorderMode,
  setMedia,
}: {
  media: MediaItem[];
  onOpenPicker: () => void;
  onRemove: (id: string) => void;
  reorderMode: boolean;
  setReorderMode: (v: boolean) => void;
  setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setMedia((items) => {
      const oldIdx = items.findIndex((m) => m.id === active.id);
      const newIdx = items.findIndex((m) => m.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return items;
      return arrayMove(items, oldIdx, newIdx);
    });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="font-semibold">Fotos e vídeos</h2>
        <p className="text-sm text-muted-foreground">
          {media.length} de {MAX_MEDIA} - Você pode enviar até {MAX_MEDIA} mídias
        </p>
        {reorderMode && (
          <p className="text-xs text-orange-500 mt-1">
            Arraste as miniaturas para reordenar
          </p>
        )}
      </div>

      {media.length === 0 ? (
        <button
          type="button"
          onClick={onOpenPicker}
          className="w-64 h-80 rounded-2xl bg-muted hover:bg-muted/80 transition-colors flex flex-col items-center justify-center gap-3 text-foreground"
        >
          <Plus className="h-10 w-10" />
          <span className="font-medium">selecionar foto ou vídeo</span>
        </button>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={media.map((m) => m.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
                {media.map((m) => (
                  <SortableMedia
                    key={m.id}
                    item={m}
                    onRemove={onRemove}
                    reorderMode={reorderMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
            <Button
              variant="outline"
              onClick={onOpenPicker}
              disabled={media.length >= MAX_MEDIA || reorderMode}
              className="h-12 rounded-full bg-card"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar mídia
            </Button>
            <Button
              variant={reorderMode ? "default" : "outline"}
              onClick={() => setReorderMode(!reorderMode)}
              disabled={media.length < 2}
              className="h-12 rounded-full"
            >
              {reorderMode ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Concluir
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Reordenar
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SortableMedia({
  item,
  onRemove,
  reorderMode,
}: {
  item: MediaItem;
  onRemove: (id: string) => void;
  reorderMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !reorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted"
      {...(reorderMode ? { ...attributes, ...listeners } : {})}
    >
      {item.type === "video" ? (
        <video src={item.previewUrl} className="w-full h-full object-cover" />
      ) : (
        <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
      )}

      {item.status === "uploading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 px-4 text-foreground backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin" />
          <div className="w-full space-y-1.5">
            <Progress value={item.uploadProgress} className="h-1.5 bg-background/60" />
            <p className="text-center text-xs font-semibold">
              {item.uploadProgress}%
            </p>
          </div>
        </div>
      )}
      {item.status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-destructive/80 text-destructive-foreground text-xs px-2 text-center">
          {item.error || "Falha no upload"}
        </div>
      )}

      {!reorderMode && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label="Remover"
          className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ---------------- STEP 2 ---------------- */

function StepCompose({
  media,
  caption,
  setCaption,
  toggles,
  onPaidChange,
  onChallengeChange,
  onScheduleChange,
  setToggles,
  setMedia,
  reorderMode,
  setReorderMode,
}: {
  media: MediaItem[];
  caption: string;
  setCaption: (v: string) => void;
  toggles: Toggles;
  onPaidChange: (v: boolean) => void;
  onChallengeChange: (v: boolean) => void;
  onScheduleChange: (v: boolean) => void;
  setToggles: React.Dispatch<React.SetStateAction<Toggles>>;
  setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  reorderMode: boolean;
  setReorderMode: (v: boolean) => void;
}) {
  const first = media[0];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setMedia((items) => {
      const oldIdx = items.findIndex((m) => m.id === active.id);
      const newIdx = items.findIndex((m) => m.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return items;
      return arrayMove(items, oldIdx, newIdx);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {reorderMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={media.map((m) => m.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2">
              {media.map((m) => (
                <SortableMedia
                  key={m.id}
                  item={m}
                  onRemove={() => {}}
                  reorderMode
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : media.length === 1 && first ? (
        <div className="w-40 aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
          {first.type === "video" ? (
            <video src={first.previewUrl} className="w-full h-full object-cover" />
          ) : (
            <img src={first.previewUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {media.map((m) => (
            <div
              key={m.id}
              className="shrink-0 w-32 aspect-[3/4] rounded-2xl overflow-hidden bg-muted"
            >
              {m.type === "video" ? (
                <video src={m.previewUrl} className="w-full h-full object-cover" />
              ) : (
                <img src={m.previewUrl} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}

      <Textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Escreva uma legenda..."
        className="min-h-32 bg-muted/60 border-border resize-none"
      />

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 rounded-full bg-card">
          <Mic className="h-4 w-4 mr-2" />
          Gravar áudio
        </Button>
        <Button
          variant={reorderMode ? "default" : "outline"}
          disabled={media.length < 2}
          onClick={() => setReorderMode(!reorderMode)}
          className="h-12 rounded-full"
        >
          {reorderMode ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Concluir
            </>
          ) : (
            <>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Reordenar
            </>
          )}
        </Button>
      </div>

      <Separator />

      <div className="grid gap-1">
        <ToggleRow
          icon={<Lock className="h-5 w-5" />}
          label="Publicação paga"
          hint={
            toggles.paid.enabled && toggles.paid.priceCents != null
              ? brl.format(toggles.paid.priceCents / 100)
              : undefined
          }
          checked={toggles.paid.enabled}
          onChange={onPaidChange}
        />
        <ToggleRow
          icon={<Wallet className="h-5 w-5" />}
          label="Desafio"
          hint={
            toggles.challenge.enabled && toggles.challenge.priceCents != null
              ? brl.format(toggles.challenge.priceCents / 100)
              : undefined
          }
          checked={toggles.challenge.enabled}
          onChange={onChallengeChange}
        />
        <ToggleRow
          icon={<Clock className="h-5 w-5" />}
          label="Post 24 horas"
          checked={toggles.expires24h}
          onChange={(v) => setToggles((t) => ({ ...t, expires24h: v }))}
        />
        <Separator className="my-2" />
        <ToggleRow
          icon={<CalendarIcon className="h-5 w-5" />}
          label="Agendar publicação"
          hint={
            toggles.schedule.enabled && toggles.schedule.at
              ? format(new Date(toggles.schedule.at), "dd/MM HH:mm", {
                  locale: ptBR,
                })
              : undefined
          }
          checked={toggles.schedule.enabled}
          onChange={onScheduleChange}
        />
        <ToggleRow
          icon={<Ban className="h-5 w-5" />}
          label="Desligar comentários"
          checked={toggles.commentsDisabled}
          onChange={(v) => setToggles((t) => ({ ...t, commentsDisabled: v }))}
        />
        <ToggleRow
          icon={<Pin className="h-5 w-5" />}
          label="Postar fixado ao topo"
          checked={toggles.pinnedToTop}
          onChange={(v) => setToggles((t) => ({ ...t, pinnedToTop: v }))}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 py-3 cursor-pointer">
      <span className="text-foreground">{icon}</span>
      <span className="flex-1 font-medium">
        {label}
        {hint && (
          <span className="ml-2 text-xs text-orange-500 font-semibold">{hint}</span>
        )}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/* ---------------- DIALOGS ---------------- */

function PriceDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  minCents,
  maxCents,
  initialCents,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle: string | null;
  minCents: number;
  maxCents: number;
  initialCents: number;
  onConfirm: (cents: number) => void;
}) {
  const [cents, setCents] = useState(initialCents);
  const stepCents = 100;

  useEffect(() => {
    if (open) setCents(Math.max(minCents, Math.min(maxCents, initialCents)));
  }, [open, initialCents, minCents, maxCents]);

  const clamp = (v: number) => Math.max(minCents, Math.min(maxCents, v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="pt-2 pb-1">
          {subtitle && (
            <p className="text-center text-sm text-muted-foreground mb-2">
              {subtitle}
            </p>
          )}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setCents((c) => clamp(c - stepCents))}
              className="h-11 w-11 grid place-items-center rounded-full bg-orange-500 hover:bg-orange-600 text-white"
              aria-label="Diminuir"
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="flex-1 text-center text-3xl font-black tracking-tight">
              {brl.format(cents / 100)}
            </div>
            <button
              type="button"
              onClick={() => setCents((c) => clamp(c + stepCents))}
              className="h-11 w-11 grid place-items-center rounded-full bg-orange-500 hover:bg-orange-600 text-white"
              aria-label="Aumentar"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 px-1">
            <Slider
              min={minCents}
              max={maxCents}
              step={stepCents}
              value={[cents]}
              onValueChange={([v]) => setCents(clamp(v ?? minCents))}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            <span className="font-semibold">mínimo</span> : {brl.format(minCents / 100)} —{" "}
            <span className="font-semibold">máximo</span> : {brl.format(maxCents / 100)}
          </p>
          <Button
            onClick={() => onConfirm(cents)}
            className="w-full h-12 mt-6 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-pink-400 hover:opacity-95 text-white font-semibold"
          >
            Avançar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  initial,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: string | null;
  onConfirm: (iso: string) => void;
}) {
  const initialDate = useMemo(
    () => (initial ? new Date(initial) : new Date(Date.now() + 15 * 60 * 1000)),
    [initial],
  );
  const [date, setDate] = useState<Date>(initialDate);
  const [time, setTime] = useState(() => format(initialDate, "HH:mm"));

  useEffect(() => {
    if (open) {
      setDate(initialDate);
      setTime(format(initialDate, "HH:mm"));
    }
  }, [open, initialDate]);

  const combine = () => {
    const [hh, mm] = time.split(":").map((v) => parseInt(v, 10));
    const d = new Date(date);
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d;
  };

  const handleApply = () => {
    const d = combine();
    const min = new Date(Date.now() + 5 * 60 * 1000);
    if (d.getTime() < min.getTime()) {
      toast.error("A data/hora deve ser no futuro (mín. 15 min).");
      return;
    }
    onConfirm(d.toISOString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Agendando publicação</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="date" className="w-full">
          <TabsList className="grid grid-cols-2 w-full bg-transparent border-b border-border rounded-none h-auto p-0">
            <TabsTrigger
              value="date"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-500 data-[state=active]:bg-transparent font-bold text-base py-3"
            >
              {format(date, "MMM dd, EEE.", { locale: ptBR })}
            </TabsTrigger>
            <TabsTrigger
              value="time"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-500 data-[state=active]:bg-transparent font-bold text-base py-3"
            >
              {time}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="date" className="mt-4">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              locale={ptBR}
              className="rounded-md pointer-events-auto mx-auto"
            />
          </TabsContent>
          <TabsContent value="time" className="mt-4">
            <div className="flex justify-center">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="text-4xl font-bold bg-transparent border-b-2 border-orange-500 text-center outline-none py-4"
              />
            </div>
          </TabsContent>
        </Tabs>
        <Button
          onClick={handleApply}
          className="w-full h-12 mt-4 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-pink-400 hover:opacity-95 text-white font-semibold"
        >
          Aplicar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
