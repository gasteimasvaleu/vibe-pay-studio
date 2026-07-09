import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Ban,
  Calendar,
  Camera,
  Clock,
  FolderPlus,
  Image as ImageIcon,
  Lock,
  Mic,
  Pin,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/publisher")({
  head: () => ({
    meta: [
      { title: "Nova publicação" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublisherPage,
});

type MediaItem = { id: string; url: string; type: "image" | "video" };

function PublisherPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState("");
  const [toggles, setToggles] = useState({
    paid: false,
    challenge: false,
    post24h: false,
    schedule: false,
    disableComments: false,
    pinToTop: false,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const goBack = () => {
    if (step === 2) return setStep(1);
    router.history.back();
  };

  const openPicker = () => setPickerOpen(true);
  const triggerFileInput = () => {
    setPickerOpen(false);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 10 - media.length).map((f) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video") ? ("video" as const) : ("image" as const),
    }));
    setMedia((m) => [...m, ...arr]);
  };

  const removeMedia = (id: string) =>
    setMedia((m) => m.filter((x) => x.id !== id));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto h-14 px-4 flex items-center">
          <button
            onClick={goBack}
            aria-label="Voltar"
            className="p-2 -ml-2 rounded-md hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold pr-6">
            {step === 1 ? "Enviando mídia" : "Criando publicação"}
          </h1>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 pb-40">
        {step === 1 ? (
          <StepMedia
            media={media}
            onOpenPicker={openPicker}
            onRemove={removeMedia}
          />
        ) : (
          <StepCompose
            media={media}
            caption={caption}
            setCaption={setCaption}
            toggles={toggles}
            setToggles={setToggles}
          />
        )}
      </main>

      <footer className="fixed bottom-16 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {step === 1 ? (
            <Button
              className="w-full h-12 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-semibold disabled:opacity-40 disabled:bg-muted disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
              disabled={media.length === 0}
              onClick={() => setStep(2)}
            >
              Continuar
            </Button>
          ) : (
            <Button className="w-full h-12 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-pink-400 hover:opacity-95 text-white font-semibold">
              Postar
            </Button>
          )}
        </div>
      </footer>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl sm:max-w-[420px] sm:mx-auto sm:left-0 sm:right-0">
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
              label="Acervo na Privacy"
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

function StepMedia({
  media,
  onOpenPicker,
  onRemove,
}: {
  media: MediaItem[];
  onOpenPicker: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="font-semibold">Fotos e vídeos</h2>
        <p className="text-sm text-muted-foreground">
          {media.length} de 10 - Você pode enviar até 10 mídias
        </p>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
            {media.map((m) => (
              <div
                key={m.id}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted"
              >
                {m.type === "video" ? (
                  <video src={m.url} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={m.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onRemove(m.id)}
                  aria-label="Remover"
                  className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
            <Button
              variant="outline"
              onClick={onOpenPicker}
              disabled={media.length >= 10}
              className="h-12 rounded-full bg-card"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar mídia
            </Button>
            <Button
              variant="outline"
              disabled={media.length < 2}
              className="h-12 rounded-full bg-card"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Reordenar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

type Toggles = {
  paid: boolean;
  challenge: boolean;
  post24h: boolean;
  schedule: boolean;
  disableComments: boolean;
  pinToTop: boolean;
};

function StepCompose({
  media,
  caption,
  setCaption,
  toggles,
  setToggles,
}: {
  media: MediaItem[];
  caption: string;
  setCaption: (v: string) => void;
  toggles: Toggles;
  setToggles: React.Dispatch<React.SetStateAction<Toggles>>;
}) {
  const first = media[0];
  return (
    <div className="flex flex-col gap-6">
      {first && (
        <div className="w-40 aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
          {first.type === "video" ? (
            <video src={first.url} className="w-full h-full object-cover" />
          ) : (
            <img src={first.url} alt="" className="w-full h-full object-cover" />
          )}
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
          variant="outline"
          disabled={media.length < 2}
          className="h-12 rounded-full bg-card"
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Reordenar
        </Button>
      </div>

      <Separator />

      <div className="grid gap-1">
        <ToggleRow
          icon={<Lock className="h-5 w-5" />}
          label="Publicação paga"
          checked={toggles.paid}
          onChange={(v) => setToggles((t) => ({ ...t, paid: v }))}
        />
        <ToggleRow
          icon={<Wallet className="h-5 w-5" />}
          label="Desafio"
          checked={toggles.challenge}
          onChange={(v) => setToggles((t) => ({ ...t, challenge: v }))}
        />
        <ToggleRow
          icon={<Clock className="h-5 w-5" />}
          label="Post 24 horas"
          checked={toggles.post24h}
          onChange={(v) => setToggles((t) => ({ ...t, post24h: v }))}
        />
        <Separator className="my-2" />
        <ToggleRow
          icon={<Calendar className="h-5 w-5" />}
          label="Agendar publicação"
          checked={toggles.schedule}
          onChange={(v) => setToggles((t) => ({ ...t, schedule: v }))}
        />
        <ToggleRow
          icon={<Ban className="h-5 w-5" />}
          label="Desligar comentários"
          checked={toggles.disableComments}
          onChange={(v) => setToggles((t) => ({ ...t, disableComments: v }))}
        />
        <ToggleRow
          icon={<Pin className="h-5 w-5" />}
          label="Postar fixado ao topo"
          checked={toggles.pinToTop}
          onChange={(v) => setToggles((t) => ({ ...t, pinToTop: v }))}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 py-3 cursor-pointer">
      <span className="text-foreground">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
