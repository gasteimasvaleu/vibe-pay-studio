import { useRef, useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const MAX_DESC = 5000;
const MAX_MEDIA = 5;

export const Route = createFileRoute("/_authenticated/bugreport")({
  head: () => ({
    meta: [
      { title: "Reportar bug · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: BugReportPage,
});

type MediaItem = { id: string; file: File; url: string };

function BugReportPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);

  const canSubmit = titulo.trim().length > 0 && descricao.trim().length > 0;

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_MEDIA - media.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_MEDIA} mídias.`);
      return;
    }
    const next: MediaItem[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      next.push({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      });
    }
    setMedia((prev) => [...prev, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeMedia(id: string) {
    setMedia((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((m) => m.id !== id);
    });
  }

  function handleSubmit() {
    if (!canSubmit) return;
    toast.success("Bug reportado com sucesso");
    setTitulo("");
    setDescricao("");
    media.forEach((m) => URL.revokeObjectURL(m.url));
    setMedia([]);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border bg-white">
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
            Reportar bug
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-8">
        <section className="space-y-1">
          <h2 className="text-2xl font-black text-foreground">
            O que aconteceu?
          </h2>
          <p className="text-sm text-muted-foreground">
            Descreva o bug e nos ajude a resolver rápido.
          </p>
        </section>

        <div className="space-y-2">
          <label
            htmlFor="bug-title"
            className="text-sm font-bold text-foreground"
          >
            Título
          </label>
          <Input
            id="bug-title"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Falha ao sacar"
            maxLength={120}
            className="h-12 bg-muted/60 border-transparent"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="bug-desc"
            className="text-sm font-bold text-foreground"
          >
            Descrição
          </label>
          <Textarea
            id="bug-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value.slice(0, MAX_DESC))}
            placeholder="Conte o que aconteceu e em qual tela você estava..."
            className="min-h-[180px] bg-muted/60 border-transparent resize-none"
          />
          <p className="text-right text-xs text-muted-foreground">
            {descricao.length} / {MAX_DESC}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">
            Enviar mídia (opcional)
          </p>
          <p className="text-sm text-muted-foreground">
            Print, vídeo ou gravação de tela (até {MAX_MEDIA} mídias)
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {media.map((m) => (
              <div
                key={m.id}
                className="relative h-28 w-28 rounded-2xl overflow-hidden border border-border bg-muted"
              >
                {m.file.type.startsWith("video/") ? (
                  <video
                    src={m.url}
                    className="h-full w-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={m.url}
                    alt={m.file.name}
                    className="h-full w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(m.id)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 text-foreground grid place-items-center shadow-sm hover:bg-background"
                  aria-label="Remover mídia"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {media.length < MAX_MEDIA && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="h-28 w-28 rounded-2xl border border-dashed border-border bg-card grid place-items-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">Subir mídia</span>
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-12 rounded-md text-base font-semibold"
        >
          Enviar
        </Button>
      </main>
    </div>
  );
}
