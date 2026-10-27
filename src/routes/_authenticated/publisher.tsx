import { createFileRoute, useRouter } from "@tanstack/react-router";
import { MentionPicker } from "@/components/publisher/MentionPicker";
import { getMyRoles } from "@/lib/admin-dashboard.functions";
import type { MentionedProfile } from "@/lib/publications.functions";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  Pencil,
  Pin,
  Plus,
  Trash2,
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
import { VaultPickerSheet } from "@/components/publisher/VaultPickerSheet";
import { CameraCaptureDialog } from "@/components/publisher/CameraCaptureDialog";

import type { VaultMediaItem } from "@/lib/vault.functions";

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
  durationSeconds?: number;
  error?: string;
};

async function readVideoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      const done = (value?: number) => {
        URL.revokeObjectURL(url);
        resolve(value);
      };
      video.onloadedmetadata = () => {
        const d = video.duration;
        done(Number.isFinite(d) && d > 0 ? Math.round(d) : undefined);
      };
      video.onerror = () => done(undefined);
      video.src = url;
    } catch {
      resolve(undefined);
    }
  });
}

type AudioRecording = {
  status: "idle" | "recording" | "uploading" | "ready" | "error";
  previewUrl?: string;
  storagePath?: string;
  publicUrl?: string;
  elapsedSec: number;
  uploadProgress: number;
  error?: string;
};

type PreviewMedia = {
  status: "uploading" | "ready" | "error";
  type: "image" | "video";
  previewUrl: string;
  storagePath?: string;
  publicUrl?: string;
  uploadProgress: number;
  error?: string;
};

const MAX_AUDIO_SEC = 300;

function formatAudioTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type Toggles = {
  paid: { enabled: boolean; priceCents: number | null };
  challenge: { enabled: boolean; goalCents: number | null; tiersCents: number[] };
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

function ActiveProfileBadge() {
  const { data } = useQuery({
    queryKey: ["publisher-active-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const [{ data: prof }, { data: cps }] = await Promise.all([
        supabase
          .from("profiles_public")
          .select("active_view, active_profile_id, free_profile_enabled, account_type, username, avatar_url")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("creator_profiles")
          .select("id, kind, username, display_name, avatar_url")
          .eq("user_id", uid),
      ]);
      const rows = ((cps ?? []) as Array<{ id: string; kind: string; username: string; display_name: string | null; avatar_url: string | null }>);
      const active =
        rows.find((r) => r.id === prof?.active_profile_id) ??
        rows.find((r) => (prof?.active_view === "free" ? r.kind === "free" : r.kind === "paid")) ??
        rows[0] ??
        null;
      return { prof, active, rows };
    },
    staleTime: 30_000,
  });

  if (!data) return null;
  const prof = data.prof;
  const active = data.active;
  const canSwitch =
    prof?.account_type === "free_creator" ||
    (prof?.account_type === "creator" && (prof?.free_profile_enabled === true || data.rows.some((r) => r.kind === "free")));
  if (!canSwitch || !active) return null;

  const isFree = active.kind === "free";
  const label = `@${active.username ?? "perfil"}`;
  const name = active.display_name ?? (isFree ? "Perfil gratuito" : "Perfil pago");
  const avatar = active.avatar_url ?? prof?.avatar_url ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-2">
      <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${isFree ? "bg-muted border-border" : "bg-primary/10 border-primary/30"}`}>
        {avatar ? (
          <img src={avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <div className="h-5 w-5 rounded-full bg-muted-foreground/20" />
        )}
        <span className="text-muted-foreground">Publicando em</span>
        <span className="font-medium text-foreground">{name}</span>
        <span className="text-muted-foreground">· {label}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${isFree ? "bg-muted-foreground/15 text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
          {isFree ? "GRATUITO" : "PAGO"}
        </span>
      </div>
    </div>
  );
}

function PublisherPage() {

  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState("");
  const [toggles, setToggles] = useState<Toggles>({
    paid: { enabled: false, priceCents: null },
    challenge: { enabled: false, goalCents: null, tiersCents: [] },
    expires24h: false,
    schedule: { enabled: false, at: null },
    commentsDisabled: false,
    pinnedToTop: false,
  });
  const [reorderMode, setReorderMode] = useState(false);
  const [audio, setAudio] = useState<AudioRecording>({
    status: "idle",
    elapsedSec: 0,
    uploadProgress: 0,
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaCameraInputRef = useRef<HTMLInputElement | null>(null);
  const previewInputRef = useRef<HTMLInputElement | null>(null);
  const previewCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [paidOpen, setPaidOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeTiersOpen, setChallengeTiersOpen] = useState(false);
  const [challengeDraftGoal, setChallengeDraftGoal] = useState<number>(5000);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewMedia | null>(null);
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [vaultPickerTarget, setVaultPickerTarget] = useState<"media" | "preview">("media");
  const [cameraOpen, setCameraOpen] = useState<null | { target: "media" | "preview" }>(null);
  const [mentions, setMentions] = useState<MentionedProfile[]>([]);

  const rolesFn = useServerFn(getMyRoles);
  const rolesQ = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => rolesFn(),
    staleTime: 60_000,
  });
  const isAdmin = rolesQ.data?.isAdmin ?? false;


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
  const audioBusy = audio.status === "recording" || audio.status === "uploading";
  const previewBusy = preview?.status === "uploading";
  const previewMissing =
    (toggles.paid.enabled || toggles.challenge.enabled) &&
    (!preview || preview.status !== "ready");
  const canContinue =
    media.length > 0 &&
    uploadingCount === 0 &&
    errorCount === 0 &&
    !audioBusy &&
    !previewBusy &&
    !previewMissing;

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
  const triggerMediaCamera = () => {
    flushSync(() => setPickerOpen(false));
    if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
      setCameraOpen({ target: "media" });
    } else {
      mediaCameraInputRef.current?.click();
    }
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

    for (const { id, file } of uploadJobs) {
      if (!file.type.startsWith("video")) continue;
      void readVideoDuration(file).then((durationSeconds) => {
        if (!durationSeconds) return;
        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, durationSeconds } : m)),
        );
      });
    }



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

  const clearPreview = async () => {
    const prev = preview;
    setPreview(null);
    if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
    if (prev?.storagePath) {
      try {
        await deleteDraft({ data: { storagePath: prev.storagePath } });
      } catch {
        // silencioso
      }
    }
  };

  const openPreviewSheet = () => setPreviewSheetOpen(true);

  const triggerPreviewLibrary = () => {
    flushSync(() => setPreviewSheetOpen(false));
    previewInputRef.current?.click();
  };
  const triggerPreviewCamera = () => {
    flushSync(() => setPreviewSheetOpen(false));
    if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
      setCameraOpen({ target: "preview" });
    } else {
      previewCameraInputRef.current?.click();
    }
  };


  const openVaultPicker = (target: "media" | "preview") => {
    flushSync(() => {
      setPickerOpen(false);
      setPreviewSheetOpen(false);
    });
    setVaultPickerTarget(target);
    setVaultPickerOpen(true);
  };

  const handleVaultPick = (items: VaultMediaItem[]) => {
    const usable = items.filter((it) => it.type === "image" || it.type === "video" || it.type === "gif");
    if (usable.length === 0) {
      toast.error("Nenhuma mídia compatível selecionada");
      return;
    }

    if (vaultPickerTarget === "preview") {
      const first = usable[0];
      setPreview((prev) => {
        if (prev?.previewUrl && prev.storagePath) {
          // Não deleta drafts do acervo — apenas descarta referência local.
        }
        return {
          status: "ready",
          type: first.type === "video" ? "video" : "image",
          previewUrl: first.url,
          publicUrl: first.url,
          storagePath: first.storagePath,
          uploadProgress: 100,
        };
      });
      return;
    }

    const remaining = MAX_MEDIA - media.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_MEDIA} mídias por publicação`);
      return;
    }
    const slice = usable.slice(0, remaining);
    if (slice.length < usable.length) {
      toast.info(`Apenas ${slice.length} mídia(s) adicionadas (limite ${MAX_MEDIA})`);
    }
    const newItems: MediaItem[] = slice.map((it) => ({
      id: crypto.randomUUID(),
      previewUrl: it.url,
      publicUrl: it.url,
      storagePath: it.storagePath,
      type: it.type === "video" ? "video" : "image",
      status: "ready",
      uploadProgress: 100,
    }));
    setMedia((m) => [...m, ...newItems]);
  };

  const onPreviewFile = async (file: File | null | undefined) => {
    if (!file) return;
    const sessionRes = await supabase.auth.getSession();
    const session = sessionRes.data.session;
    const userId = session?.user.id;
    const token = session?.access_token;
    if (!userId || !token) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }
    const isVideo = file.type.startsWith("video");
    const type: "image" | "video" = isVideo ? "video" : "image";
    const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
      toast.error(
        `${file.name} excede o limite de ${isVideo ? "200MB" : "15MB"}`,
      );
      return;
    }

    // Cleanup previous preview file
    const previous = preview;
    if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
    if (previous?.storagePath) {
      void deleteDraft({ data: { storagePath: previous.storagePath } }).catch(
        () => {},
      );
    }

    const id = crypto.randomUUID();
    const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
    const path = `posts/${userId}/drafts/preview-${id}.${ext}`;
    const previewUrl = URL.createObjectURL(file);
    setPreview({
      status: "uploading",
      type,
      previewUrl,
      uploadProgress: 0,
    });
    try {
      await uploadWithProgress({
        file,
        path,
        token,
        onProgress: (progress) =>
          setPreview((p) => (p ? { ...p, uploadProgress: progress } : p)),
      });
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_EXPIRES_IN);
      if (signErr || !signed) {
        throw new Error(signErr?.message ?? "Falha ao gerar URL da prévia");
      }
      setPreview({
        status: "ready",
        type,
        previewUrl,
        storagePath: path,
        publicUrl: signed.signedUrl,
        uploadProgress: 100,
      });
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setPreview({
        status: "error",
        type,
        previewUrl,
        uploadProgress: 0,
        error: err instanceof Error ? err.message : "Falha no upload",
      });
      toast.error("Falha ao enviar prévia");
    }
  };

  const stopMediaRecorder = () => {


    if (audioTimerRef.current !== null) {
      window.clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        // noop
      }
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  };

  const uploadAudioBlob = async (blob: Blob, previewUrl: string) => {
    const sessionRes = await supabase.auth.getSession();
    const session = sessionRes.data.session;
    const userId = session?.user.id;
    const token = session?.access_token;
    if (!userId || !token) {
      toast.error("Sessão expirada. Faça login novamente.");
      URL.revokeObjectURL(previewUrl);
      setAudio({ status: "idle", elapsedSec: 0, uploadProgress: 0 });
      return;
    }
    const id = crypto.randomUUID();
    const path = `posts/${userId}/drafts/audio-${id}.webm`;
    const file = new File([blob], `audio-${id}.webm`, {
      type: blob.type || "audio/webm",
    });
    setAudio((a) => ({
      ...a,
      status: "uploading",
      previewUrl,
      storagePath: path,
      uploadProgress: 0,
    }));
    try {
      await uploadWithProgress({
        file,
        path,
        token,
        onProgress: (progress) =>
          setAudio((a) => ({ ...a, uploadProgress: progress })),
      });
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_EXPIRES_IN);
      if (signErr || !signed) throw new Error(signErr?.message ?? "Falha ao gerar URL do áudio");
      setAudio((a) => ({
        ...a,
        status: "ready",
        previewUrl,
        storagePath: path,
        publicUrl: signed.signedUrl,
        uploadProgress: 100,
      }));
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setAudio({
        status: "error",
        elapsedSec: 0,
        uploadProgress: 0,
        error: err instanceof Error ? err.message : "Falha no upload do áudio",
      });
      toast.error("Falha ao enviar áudio");
    }
  };

  const startAudioRecording = async () => {
    if (audio.status === "recording" || audio.status === "uploading") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (chunks.length === 0) {
          setAudio({ status: "idle", elapsedSec: 0, uploadProgress: 0 });
          return;
        }
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const previewUrl = URL.createObjectURL(blob);
        void uploadAudioBlob(blob, previewUrl);
      };
      rec.start();
      setAudio({ status: "recording", elapsedSec: 0, uploadProgress: 0 });
      audioTimerRef.current = window.setInterval(() => {
        setAudio((a) => {
          if (a.status !== "recording") return a;
          const next = a.elapsedSec + 1;
          if (next >= MAX_AUDIO_SEC) {
            // hit cap: stop and process
            stopMediaRecorder();
            return { ...a, elapsedSec: MAX_AUDIO_SEC };
          }
          return { ...a, elapsedSec: next };
        });
      }, 1000);
    } catch (err) {
      toast.error(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Permissão de microfone negada"
          : "Não foi possível acessar o microfone",
      );
    }
  };

  const cancelAudioRecording = () => {
    // Discard the blob: swap onstop to reset only
    const rec = mediaRecorderRef.current;
    if (rec) {
      rec.onstop = () => {
        audioChunksRef.current = [];
        setAudio({ status: "idle", elapsedSec: 0, uploadProgress: 0 });
      };
    }
    stopMediaRecorder();
    if (!rec) setAudio({ status: "idle", elapsedSec: 0, uploadProgress: 0 });
  };

  const confirmAudioRecording = () => {
    stopMediaRecorder(); // triggers onstop → upload
  };

  const removeAudio = async () => {
    const prev = audio;
    if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
    setAudio({ status: "idle", elapsedSec: 0, uploadProgress: 0 });
    if (prev.storagePath) {
      try {
        await deleteDraft({ data: { storagePath: prev.storagePath } });
      } catch {
        // silencioso
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioTimerRef.current !== null) {
        window.clearInterval(audioTimerRef.current);
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (audio.previewUrl) URL.revokeObjectURL(audio.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPost = () => {
    const readyMedia = media.filter((m) => m.status === "ready" && m.storagePath && m.publicUrl);
    if (readyMedia.length === 0) return;
    if (audio.status === "recording" || audio.status === "uploading") return;
    const visibility: "public" | "paid" | "challenge" = toggles.paid.enabled
      ? "paid"
      : toggles.challenge.enabled
        ? "challenge"
        : "public";
    if (
      (visibility === "paid" || visibility === "challenge") &&
      (!preview || preview.status !== "ready")
    ) {
      toast.error("Adicione uma mídia de prévia");
      setPreviewSheetOpen(true);
      return;
    }
    mutation.mutate({
      data: {
        caption: caption.trim() || null,
        visibility,
        priceCents: toggles.paid.priceCents,
        challengeCents: toggles.challenge.goalCents,
        challengeTiersCents: toggles.challenge.tiersCents,
        expires24h: toggles.expires24h,
        scheduledAt: toggles.schedule.at,
        commentsDisabled: toggles.commentsDisabled,
        pinned: toggles.pinnedToTop,
        mentionProfileIds: isAdmin ? mentions.map((m) => m.id) : undefined,
        media: readyMedia.map((m) => ({
          storagePath: m.storagePath!,
          url: m.publicUrl!,
          type: m.type,
          durationSeconds: m.durationSeconds ?? null,
        })),
        audio:
          audio.status === "ready" && audio.storagePath && audio.publicUrl
            ? { storagePath: audio.storagePath, url: audio.publicUrl }
            : null,
        preview:
          (visibility === "paid" || visibility === "challenge") &&
          preview &&
          preview.status === "ready" &&
          preview.storagePath &&
          preview.publicUrl
            ? {
                storagePath: preview.storagePath,
                url: preview.publicUrl,
                type: preview.type,
              }
            : null,
      },
    });
  };

  // Handlers for switches
  const onPaidChange = (v: boolean) => {
    if (v) setPaidOpen(true);
    else {
      setToggles((t) => ({ ...t, paid: { enabled: false, priceCents: null } }));
      void clearPreview();
    }
  };
  const onChallengeChange = (v: boolean) => {
    if (v) setChallengeOpen(true);
    else {
      setToggles((t) => ({
        ...t,
        challenge: { enabled: false, goalCents: null, tiersCents: [] },
      }));
      void clearPreview();
    }
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
        <ActiveProfileBadge />
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

      <input
        ref={mediaCameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <input
        ref={previewInputRef}
        type="file"
        accept="image/*,video/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void onPreviewFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <input
        ref={previewCameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void onPreviewFile(e.target.files?.[0]);
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
            audio={audio}
            onStartAudio={startAudioRecording}
            onCancelAudio={cancelAudioRecording}
            onConfirmAudio={confirmAudioRecording}
            onRemoveAudio={removeAudio}
            preview={preview}
            onEditPreview={openPreviewSheet}
            onEditPrice={() => setPaidOpen(true)}
            mentionSlot={
              isAdmin ? (
                <MentionPicker selected={mentions} onChange={setMentions} />
              ) : null
            }
          />
        )}
      </main>

      <footer className="fixed bottom-16 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {step === 1 ? (
            <Button
              className="w-full rounded-md bg-gradient-to-r from-primary to-primary/80 hover:opacity-95 text-white font-semibold disabled:opacity-40 disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
              disabled={!canContinue}
              onClick={() => setStep(2)}
            >
              {uploadingCount > 0
                ? `Enviando (${uploadingCount})...`
                : "Continuar"}
            </Button>
          ) : (
            <Button
              className="w-full rounded-md bg-gradient-to-r from-primary to-primary/80 hover:opacity-95 text-white font-semibold disabled:opacity-40 disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
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
              onClick={() => openVaultPicker("media")}
            />
            <PickerOption
              icon={<Camera className="h-5 w-5" />}
              label="Câmera"
              onClick={triggerMediaCamera}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl sm:max-w-[420px] sm:mx-auto sm:left-0 sm:right-0"
        >
          <SheetHeader>
            <SheetTitle>Adicionar prévia</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground pt-1">
            Para publicar <strong className="text-foreground">conteúdo pago</strong>, é necessário definir uma <strong className="text-foreground">mídia de prévia</strong>.
          </p>
          <div className="grid gap-3 py-4">
            <PickerOption
              icon={<ImageIcon className="h-5 w-5" />}
              label="Biblioteca do dispositivo"
              onClick={triggerPreviewLibrary}
            />
            <PickerOption
              icon={<FolderPlus className="h-5 w-5" />}
              label="Acervo no Monetisexy"
              onClick={() => openVaultPicker("preview")}
            />
            <PickerOption
              icon={<Camera className="h-5 w-5" />}
              label="Câmera"
              onClick={triggerPreviewCamera}
            />
          </div>
        </SheetContent>
      </Sheet>

      <VaultPickerSheet
        open={vaultPickerOpen}
        onOpenChange={setVaultPickerOpen}
        mode={vaultPickerTarget}
        maxSelectable={Math.max(1, MAX_MEDIA - media.length)}
        onConfirm={handleVaultPick}
      />

      <CameraCaptureDialog
        open={cameraOpen !== null}
        onOpenChange={(v) => {
          if (!v) setCameraOpen(null);
        }}
        accept="both"
        multi={cameraOpen?.target === "media"}
        onCapture={(files) => {
          if (!cameraOpen) return;
          if (cameraOpen.target === "media") {
            const dt = new DataTransfer();
            files.forEach((f) => dt.items.add(f));
            void onFiles(dt.files);
          } else {
            void onPreviewFile(files[0]);
          }
          setCameraOpen(null);
        }}
      />





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
            challenge: { enabled: false, goalCents: null, tiersCents: [] },
          }));
          setPaidOpen(false);
          setPreviewSheetOpen(true);
        }}
      />

      <ChallengeGoalSheet
        open={challengeOpen}
        onOpenChange={(v) => {
          setChallengeOpen(v);
          if (!v && !toggles.challenge.enabled) {
            setToggles((t) => ({
              ...t,
              challenge: { enabled: false, goalCents: null, tiersCents: [] },
            }));
          }
        }}
        initialCents={toggles.challenge.goalCents ?? challengeDraftGoal}
        onNext={(cents) => {
          setChallengeDraftGoal(cents);
          setChallengeOpen(false);
          setChallengeTiersOpen(true);
        }}
      />

      <ChallengeTiersSheet
        open={challengeTiersOpen}
        onOpenChange={(v) => {
          setChallengeTiersOpen(v);
          if (!v && !toggles.challenge.enabled) {
            setToggles((t) => ({
              ...t,
              challenge: { enabled: false, goalCents: null, tiersCents: [] },
            }));
          }
        }}
        goalCents={challengeDraftGoal}
        initialTiers={toggles.challenge.tiersCents}
        onBack={() => {
          setChallengeTiersOpen(false);
          setChallengeOpen(true);
        }}
        onConfirm={(tiers) => {
          setToggles((t) => ({
            ...t,
            challenge: { enabled: true, goalCents: challengeDraftGoal, tiersCents: tiers },
            paid: { enabled: false, priceCents: null },
          }));
          setChallengeTiersOpen(false);
          setPreviewSheetOpen(true);
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
      className="w-full flex items-center gap-3 px-4 py-4 rounded-md bg-muted hover:bg-muted/80 transition-colors text-left"
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
          <p className="text-xs text-primary mt-1">
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
              className="h-9 rounded-md bg-card"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar mídia
            </Button>
            <Button
              variant={reorderMode ? "default" : "outline"}
              onClick={() => setReorderMode(!reorderMode)}
              disabled={media.length < 2}
              className="h-9 rounded-md"
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
  audio,
  onStartAudio,
  onCancelAudio,
  onConfirmAudio,
  onRemoveAudio,
  preview,
  onEditPreview,
  onEditPrice,
  mentionSlot,
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
  audio: AudioRecording;
  onStartAudio: () => void;
  onCancelAudio: () => void;
  onConfirmAudio: () => void;
  onRemoveAudio: () => void;
  preview: PreviewMedia | null;
  onEditPreview: () => void;
  onEditPrice: () => void;
  mentionSlot?: React.ReactNode;
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
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {(toggles.paid.enabled || toggles.challenge.enabled) && (
            <button
              type="button"
              onClick={onEditPreview}
              className={`relative shrink-0 w-32 aspect-[3/4] rounded-2xl overflow-hidden bg-muted ring-2 ring-primary ${
                preview?.status === "ready" ? "" : "border-2 border-dashed border-primary"
              }`}
              aria-label={preview ? "Editar prévia" : "Adicionar prévia"}
            >
              {preview?.status === "ready" ? (
                preview.type === "video" ? (
                  <video src={preview.previewUrl} className="w-full h-full object-cover" />
                ) : (
                  <img src={preview.previewUrl} alt="Prévia" className="w-full h-full object-cover" />
                )
              ) : preview?.status === "uploading" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm px-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <Progress value={preview.uploadProgress} className="h-1.5 w-full" />
                  <span className="text-[10px] font-semibold">{preview.uploadProgress}%</span>
                </div>
              ) : (
                <div className="absolute inset-0 grid place-items-center text-primary">
                  <Plus className="h-8 w-8" />
                </div>
              )}
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold px-2 py-1 shadow-md">
                <ImageIcon className="h-3 w-3" />
                Prévia
              </span>
            </button>
          )}
          {media.length === 1 && first && !toggles.paid.enabled ? (
            <div className="w-40 aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
              {first.type === "video" ? (
                <video src={first.previewUrl} className="w-full h-full object-cover" />
              ) : (
                <img src={first.previewUrl} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ) : (
            media.map((m) => (
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
            ))
          )}
        </div>
      )}

      <Textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Escreva uma legenda..."
        className="min-h-32 bg-muted/60 border-border resize-none"
      />

      {mentionSlot}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onStartAudio}
            disabled={audio.status !== "idle" && audio.status !== "error"}
            className="rounded-md bg-card"
          >
            <Mic className="h-4 w-4 mr-2" />
            Gravar áudio
          </Button>
          <Button
            variant={reorderMode ? "default" : "outline"}
            disabled={media.length < 2}
            onClick={() => setReorderMode(!reorderMode)}
            className="h-9 rounded-md"
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

        {audio.status === "recording" && (
          <div className="flex items-center justify-between gap-3 h-12 pl-4 pr-2 rounded-md bg-muted/60">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="tabular-nums">{formatAudioTime(audio.elapsedSec)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Cancelar gravação"
                onClick={onCancelAudio}
                className="h-9 w-9 rounded-md bg-red-500/15 text-red-500 hover:bg-red-500/25 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Confirmar gravação"
                onClick={onConfirmAudio}
                className="h-9 w-9 rounded-md bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 flex items-center justify-center transition-colors"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {audio.status === "uploading" && (
          <div className="space-y-1.5 px-4 py-2 rounded-2xl bg-muted/60">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enviando áudio
              </span>
              <span>{audio.uploadProgress}%</span>
            </div>
            <Progress value={audio.uploadProgress} className="h-1.5" />
          </div>
        )}

        {audio.status === "ready" && audio.previewUrl && (
          <div className="flex items-center gap-2 pl-2 pr-2 py-1 rounded-md bg-muted/60">
            <audio src={audio.previewUrl} controls className="flex-1 h-9" />
            <button
              type="button"
              aria-label="Remover áudio"
              onClick={onRemoveAudio}
              className="h-9 w-9 shrink-0 rounded-md bg-red-500/15 text-red-500 hover:bg-red-500/25 flex items-center justify-center transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {audio.status === "error" && audio.error && (
          <p className="text-xs text-red-500 px-2">{audio.error}</p>
        )}
      </div>

      <Separator />

      <div className="grid gap-2">
        <ToggleRow
          icon={<Lock className="h-5 w-5" />}
          label="Publicação paga"
          checked={toggles.paid.enabled}
          onChange={onPaidChange}
        />
        {toggles.paid.enabled && (
          <div className="grid grid-cols-2 gap-3 pb-2">
            <button
              type="button"
              onClick={onEditPrice}
              className="h-9 rounded-md bg-card shadow-sm border border-border flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Pencil className="h-4 w-4" />
              {toggles.paid.priceCents != null
                ? brl.format(toggles.paid.priceCents / 100)
                : "Definir preço"}
            </button>
            <button
              type="button"
              onClick={onEditPreview}
              className="h-9 rounded-md bg-card shadow-sm border border-border flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Pencil className="h-4 w-4" />
              {preview?.status === "uploading"
                ? `Enviando ${preview.uploadProgress}%`
                : "Editar prévia"}
            </button>
          </div>
        )}
        <ToggleRow
          icon={<Wallet className="h-5 w-5" />}
          label="Desafio"
          hint={
            toggles.challenge.enabled && toggles.challenge.goalCents != null
              ? brl.format(toggles.challenge.goalCents / 100)
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
          <span className="ml-2 text-xs text-primary font-semibold">{hint}</span>
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
              className="h-11 w-11 grid place-items-center rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
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
              className="h-11 w-11 grid place-items-center rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
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
            className="w-full h-9 mt-6 rounded-md bg-gradient-primary hover:opacity-95 text-primary-foreground font-semibold"
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
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent font-bold text-base py-3"
            >
              {format(date, "MMM dd, EEE.", { locale: ptBR })}
            </TabsTrigger>
            <TabsTrigger
              value="time"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent font-bold text-base py-3"
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
                className="text-4xl font-bold bg-transparent border-b-2 border-primary text-center outline-none py-4"
              />
            </div>
          </TabsContent>
        </Tabs>
        <Button
          onClick={handleApply}
          className="w-full mt-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          Aplicar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

const CHALLENGE_MIN_GOAL = 5000;
const CHALLENGE_MAX_GOAL = 200000;
const CHALLENGE_MIN_TIER = 500;
const CHALLENGE_TIER_STEP = 50;
const CHALLENGE_MAX_TIERS = 8;

function roundToStep(v: number, step: number) {
  return Math.round(v / step) * step;
}

function ChallengeGoalSheet({
  open,
  onOpenChange,
  initialCents,
  onNext,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialCents: number;
  onNext: (cents: number) => void;
}) {
  const [cents, setCents] = useState(initialCents);
  const stepCents = 100;

  useEffect(() => {
    if (open)
      setCents(
        Math.max(CHALLENGE_MIN_GOAL, Math.min(CHALLENGE_MAX_GOAL, initialCents)),
      );
  }, [open, initialCents]);

  const clamp = (v: number) =>
    Math.max(CHALLENGE_MIN_GOAL, Math.min(CHALLENGE_MAX_GOAL, v));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto w-full sm:max-w-[440px] rounded-t-3xl p-0 border-0"
      >
        <SheetHeader className="relative px-5 pt-5 pb-2">
          <SheetTitle className="text-center text-base font-semibold">
            Criando desafio
          </SheetTitle>
        </SheetHeader>
        <div className="px-6 pb-6 pt-2">
          <p className="text-center text-sm text-muted-foreground mb-2">
            Valor do desafio
          </p>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setCents((c) => clamp(c - stepCents))}
              className="h-11 w-11 grid place-items-center rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
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
              className="h-11 w-11 grid place-items-center rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Aumentar"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 px-1">
            <Slider
              min={CHALLENGE_MIN_GOAL}
              max={CHALLENGE_MAX_GOAL}
              step={stepCents}
              value={[cents]}
              onValueChange={([v]) => setCents(clamp(v ?? CHALLENGE_MIN_GOAL))}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            <span className="font-semibold">mínimo</span> :{" "}
            {brl.format(CHALLENGE_MIN_GOAL / 100)} —{" "}
            <span className="font-semibold">máximo</span> :{" "}
            {brl.format(CHALLENGE_MAX_GOAL / 100)}
          </p>
          <Button
            onClick={() => onNext(cents)}
            className="w-full h-9 mt-6 rounded-md bg-gradient-primary hover:opacity-95 text-primary-foreground font-semibold"
          >
            Avançar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type TierRow = { id: string; value: string };

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}
function parseInputCents(v: string): number | null {
  const cleaned = v.replace(/[^\d,\.]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function ChallengeTiersSheet({
  open,
  onOpenChange,
  goalCents,
  initialTiers,
  onBack,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goalCents: number;
  initialTiers: number[];
  onBack: () => void;
  onConfirm: (tiers: number[]) => void;
}) {
  const [rows, setRows] = useState<TierRow[]>([]);

  useEffect(() => {
    if (!open) return;
    if (initialTiers.length > 0) {
      setRows(
        initialTiers.map((c, i) => ({ id: `t-${i}-${c}`, value: centsToInput(c) })),
      );
      return;
    }
    // sugestões: 25%, 50%, 75% da meta
    const suggestions = [0.25, 0.5, 0.75].map((r) => {
      const raw = Math.max(
        CHALLENGE_MIN_TIER,
        Math.min(goalCents, roundToStep(goalCents * r, CHALLENGE_TIER_STEP)),
      );
      return raw;
    });
    setRows(
      suggestions.map((c, i) => ({ id: `s-${i}-${c}`, value: centsToInput(c) })),
    );
  }, [open, goalCents, initialTiers]);

  const parsedRows = rows.map((r) => parseInputCents(r.value));
  const baseTier = CHALLENGE_MIN_TIER;
  const allTiers = [baseTier, ...parsedRows.filter((v): v is number => v !== null)];
  const dupes = new Set(
    allTiers.filter((v, i, arr) => arr.indexOf(v) !== i),
  );
  const rowErrors = parsedRows.map((v, i) => {
    if (v === null) return "Valor inválido";
    if (v <= 0) return "Valor inválido";
    if (v > goalCents) return "Acima da meta";
    if (v === baseTier || dupes.has(v)) return "Duplicada";
    return null;
  });
  const valid =
    parsedRows.every((v) => v !== null) && rowErrors.every((e) => e === null);

  const addRow = () => {
    if (rows.length + 1 >= CHALLENGE_MAX_TIERS) return; // +1 para a base fixa
    setRows((r) => [...r, { id: `n-${Date.now()}`, value: "" }]);
  };
  const removeRow = (id: string) => {
    setRows((r) => r.filter((row) => row.id !== id));
  };
  const updateRow = (id: string, value: string) => {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, value } : row)));
  };

  const handleConfirm = () => {
    if (!valid) return;
    const tiers = [
      baseTier,
      ...parsedRows.filter((v): v is number => v !== null),
    ].sort((a, b) => a - b);
    onConfirm(tiers);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto w-full sm:max-w-[440px] rounded-t-3xl p-0 border-0 max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="relative px-5 pt-5 pb-2">
          <button
            type="button"
            onClick={onBack}
            className="absolute left-4 top-4 h-9 w-9 grid place-items-center rounded-full hover:bg-accent"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <SheetTitle className="text-center text-base font-semibold">
            Criando desafio
          </SheetTitle>
        </SheetHeader>
        <div className="px-6 pb-6 pt-2 space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">Valor do desafio</p>
            <p className="text-3xl font-black tracking-tight">
              {brl.format(goalCents / 100)}
            </p>
          </div>

          <div className="space-y-3">
            {/* Faixa base fixa */}
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 pl-4 pr-4 h-14">
              <span className="text-muted-foreground text-sm mr-2">R$</span>
              <span className="text-base font-medium text-foreground flex-1">
                {centsToInput(baseTier)}
              </span>
            </div>

            {rows.map((row, i) => {
              const err = rowErrors[i];
              return (
                <div key={row.id} className="space-y-1">
                  <div
                    className={`flex items-center gap-2 rounded-md border pl-4 pr-1 h-14 bg-card ${
                      err ? "border-destructive" : "border-border"
                    }`}
                  >
                    <span className="text-muted-foreground text-sm mr-2">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.value}
                      onChange={(e) => updateRow(row.id, e.target.value)}
                      placeholder="0,00"
                      className="flex-1 bg-transparent outline-none text-base font-medium text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="h-10 w-10 grid place-items-center rounded-full text-muted-foreground hover:bg-accent"
                      aria-label="Remover faixa"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {err && (
                    <p className="text-xs text-destructive pl-4">{err}</p>
                  )}
                </div>
              );
            })}

            {rows.length + 1 < CHALLENGE_MAX_TIERS && (
              <button
                type="button"
                onClick={addRow}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                Adicionar faixa
              </button>
            )}
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!valid}
            className="w-full rounded-md bg-gradient-primary hover:opacity-95 text-primary-foreground font-semibold disabled:opacity-50"
          >
            Confirmar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

