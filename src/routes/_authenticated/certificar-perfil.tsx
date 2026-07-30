import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Check,
  Clock,
  Copy,
  Loader2,
  X,
} from "lucide-react";
import {
  createVerificationUploadUrl,
  getMyVerificationStatus,
  submitVerificationRequest,
} from "@/lib/verification.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/certificar-perfil")({
  head: () => ({
    meta: [
      { title: "Certificar perfil · Monetisexy" },
      {
        name: "description",
        content:
          "Solicite o selo de perfil certificado enviando três fotos com o código de verificação gerado pela plataforma.",
      },
      { property: "og:title", content: "Certificar perfil · Monetisexy" },
      {
        property: "og:description",
        content:
          "Envie suas fotos de verificação e receba o selo de perfil certificado no Monetisexy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CertificarPerfil,
});

const BUCKET = "profile-verification";

type Slot = { file: File | null; preview: string | null; path: string | null };

const EMPTY_SLOTS: Slot[] = [
  { file: null, preview: null, path: null },
  { file: null, preview: null, path: null },
  { file: null, preview: null, path: null },
];

function CertificarPerfil() {
  const router = useRouter();
  const statusFn = useServerFn(getMyVerificationStatus);
  const uploadUrlFn = useServerFn(createVerificationUploadUrl);
  const submitFn = useServerFn(submitVerificationRequest);
  const qc = useQueryClient();

  const [slots, setSlots] = useState<Slot[]>(EMPTY_SLOTS);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const q = useQuery({
    queryKey: ["my-verification"],
    queryFn: () => statusFn(),
    staleTime: 10_000,
  });

  const state = q.data;
  const code = state?.code ?? "";

  function pick(i: number, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie apenas imagens.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Cada foto deve ter no máximo 12 MB.");
      return;
    }
    setSlots((prev) => {
      const next = [...prev];
      if (next[i].preview) URL.revokeObjectURL(next[i].preview!);
      next[i] = { file, preview: URL.createObjectURL(file), path: null };
      return next;
    });
  }

  function clearSlot(i: number) {
    setSlots((prev) => {
      const next = [...prev];
      if (next[i].preview) URL.revokeObjectURL(next[i].preview!);
      next[i] = { file: null, preview: null, path: null };
      return next;
    });
  }

  const submit = useMutation({
    mutationFn: async () => {
      const files = slots.map((s) => s.file);
      if (files.some((f) => !f)) throw new Error("Envie as 3 fotos.");

      const paths: string[] = [];
      for (const file of files) {
        const signed = await uploadUrlFn({ data: { filename: file!.name } });
        const { error } = await supabase.storage
          .from(BUCKET)
          .uploadToSignedUrl(signed.path, signed.token, file!, {
            contentType: file!.type,
          });
        if (error) throw new Error(error.message);
        paths.push(signed.path);
      }

      return submitFn({ data: { code, photoPaths: paths } });
    },
    onSuccess: () => {
      toast.success("Pedido enviado! Nossa equipe vai analisar em breve.");
      setSlots(EMPTY_SLOTS);
      qc.invalidateQueries({ queryKey: ["my-verification"] });
    },
    onError: (e: any) => {
      const map: Record<string, string> = {
        envie_3_fotos: "Envie exatamente 3 fotos.",
        ja_existe_pedido_em_analise: "Você já tem um pedido em análise.",
        perfil_ja_certificado: "Este perfil já está certificado.",
        perfil_de_criador_nao_encontrado: "Nenhum perfil de criador ativo encontrado.",
      };
      toast.error(map[e?.message] ?? e?.message ?? "Não foi possível enviar.");
    },
  });

  const allReady = slots.every((s) => !!s.file);

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="relative mx-auto flex max-w-2xl items-center justify-center px-4 py-3">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => router.history.back()}
            className="absolute left-4 h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Certificar perfil
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4 space-y-4">
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : !state?.profileId ? (
          <Card className="p-4 text-sm text-muted-foreground">
            Você ainda não tem um perfil de criador ativo.
          </Card>
        ) : state.status === "approved" ? (
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Perfil certificado</p>
            </div>
            <p className="text-xs text-muted-foreground">
              O selo já aparece em @{state.profileUsername} no seu perfil, na busca e
              nos seus conteúdos.
            </p>
          </Card>
        ) : state.status === "pending" ? (
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold">Pedido em análise</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Enviado em{" "}
              {state.submittedAt
                ? new Date(state.submittedAt).toLocaleString("pt-BR")
                : "-"}
              . Você recebe o resultado por aqui assim que a equipe revisar.
            </p>
            <p className="text-xs text-muted-foreground">
              Código usado: <span className="font-mono font-semibold">{state.code}</span>
            </p>
          </Card>
        ) : (
          <>
            {state.status === "rejected" && (
              <Card className="p-4 space-y-1 border-destructive/40">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-semibold">Pedido recusado</p>
                </div>
                {state.adminNotes && (
                  <p className="text-xs text-muted-foreground">{state.adminNotes}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Você pode enviar um novo pedido com o código atualizado abaixo.
                </p>
              </Card>
            )}

            <Card className="p-4 space-y-3">
              <p className="text-sm font-semibold">Seu código de verificação</p>
              <div className="flex items-center gap-2">
                <span className="rounded-lg border bg-muted px-3 py-2 font-mono text-base font-bold tracking-widest">
                  {code}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(code);
                    toast.success("Código copiado");
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </Button>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Escreva o código à mão em um papel.</li>
                <li>Tire 3 fotos de corpo inteiro, com o rosto visível.</li>
                <li>Segure o papel de forma que o código fique legível.</li>
                <li>Sem filtros, edição ou recortes. Boa iluminação.</li>
              </ul>
              <p className="text-[11px] text-muted-foreground">
                As fotos são privadas: só a equipe de moderação tem acesso e elas
                nunca aparecem no seu perfil.
              </p>
            </Card>

            <Card className="p-4 space-y-3">
              <p className="text-sm font-semibold">Envie as 3 fotos</p>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot, i) => (
                  <div key={i} className="relative">
                    <input
                      ref={(el) => {
                        inputs.current[i] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => pick(i, e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => inputs.current[i]?.click()}
                      className={cn(
                        "aspect-[3/4] w-full rounded-xl border border-dashed overflow-hidden grid place-items-center transition-colors",
                        slot.preview
                          ? "border-primary/40"
                          : "border-border hover:border-muted-foreground/50 bg-muted/40",
                      )}
                    >
                      {slot.preview ? (
                        <img
                          src={slot.preview}
                          alt={`Foto de verificação ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                          <Camera className="h-5 w-5" />
                          Foto {i + 1}
                        </span>
                      )}
                    </button>
                    {slot.preview && (
                      <button
                        type="button"
                        onClick={() => clearSlot(i)}
                        aria-label={`Remover foto ${i + 1}`}
                        className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-background border grid place-items-center shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                disabled={!allReady || submit.isPending}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" /> Enviar para análise
                  </>
                )}
              </Button>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
