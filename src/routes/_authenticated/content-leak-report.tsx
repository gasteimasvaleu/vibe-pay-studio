import { useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/content-leak-report")({
  head: () => ({
    meta: [
      { title: "Reportar vazamento de conteúdo · Monetisex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContentLeakReportPage,
});

const MAX_FILES = 5;
const MAX_DESC = 5000;

function ContentLeakReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const canSubmit =
    title.trim().length > 0 &&
    url.trim().length > 0 &&
    description.trim().length > 0;

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const merged = [...files, ...incoming].slice(0, MAX_FILES);
    if (files.length + incoming.length > MAX_FILES) {
      toast.error(`Máximo de ${MAX_FILES} mídias`);
    }
    setFiles(merged);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    toast.success("Denúncia enviada");
    setTitle("");
    setUrl("");
    setDescription("");
    setFiles([]);
    router.history.back();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border backdrop-blur-md bg-card/80">
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
            Reportar vazamento de conteúdo
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">


        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Qual conteúdo foi vazado?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Informe os detalhes do uso não autorizado do seu conteúdo. O link
              é essencial para rastrearmos e investigarmos o caso.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="leak-title" className="text-sm font-semibold text-foreground">
              Título
            </label>
            <Input
              id="leak-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Meu post foi copiado sem permissão"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="leak-url" className="text-sm font-semibold text-foreground">
              URL do conteúdo vazado
            </label>
            <Input
              id="leak-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Ex: https://site.com/pagina-com-meu-conteudo"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="leak-desc" className="text-sm font-semibold text-foreground">
              Descrição
            </label>
            <Textarea
              id="leak-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
              placeholder="Descreva onde e como seu conteúdo foi vazado"
              rows={5}
              maxLength={MAX_DESC}
            />
            <div className="text-right text-xs text-muted-foreground">
              {description.length} / {MAX_DESC}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Enviar mídia (opcional)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Print, vídeo ou gravação de tela (até {MAX_FILES} mídias)
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {files.map((file, i) => (
              <div
                key={i}
                className="relative h-32 w-32 overflow-hidden rounded-xl border border-border bg-card"
              >
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                    {file.name}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground shadow"
                  aria-label="Remover mídia"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {files.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card text-sm text-foreground hover:bg-accent"
              >
                <Upload className="h-5 w-5" />
                Subir mídia
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </section>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full rounded-full text-base"
        >
          Enviar
        </Button>
        </form>
      </main>
    </div>
  );
}

