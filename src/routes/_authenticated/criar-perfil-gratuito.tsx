import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/criar-perfil-gratuito")({
  head: () => ({
    meta: [
      { title: "Criar perfil gratuito · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: CriarPerfilGratuitoPage,
});

const COVER_OPTIONS = [
  "https://picsum.photos/seed/cover-a/600/450",
  "https://picsum.photos/seed/cover-b/600/450",
  "https://picsum.photos/seed/cover-c/600/450",
];

const HERO_IMAGES = [
  "https://picsum.photos/seed/hero-a/500/700",
  "https://picsum.photos/seed/hero-b/500/700",
  "https://picsum.photos/seed/hero-c/500/700",
  "https://picsum.photos/seed/hero-d/500/500",
];

function CriarPerfilGratuitoPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 2 state
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedCover, setSelectedCover] = useState<string | null>(COVER_OPTIONS[0]);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleValid = /^[a-z0-9_.]{3,30}$/.test(handle.trim().toLowerCase());
  const canSubmit = displayName.trim().length > 0 && handleValid;

  const initials = (displayName.trim() || "CA")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "CA";

  const onAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onCoverPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedCover(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    toast.success("Perfil criado!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative flex items-center justify-center px-4 py-4">
        <button
          type="button"
          onClick={() => (step === 1 ? navigate({ to: "/dashboard" }) : setStep(1))}
          aria-label="Voltar"
          className="absolute left-4 h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">
          {step === 1 ? "Crie seu perfil gratuito" : "Personalizando perfil"}
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-32">
        {step === 1 ? (
          <section className="space-y-8">
            <div className="grid grid-cols-3 gap-2">
              <img src={HERO_IMAGES[0]} alt="" className="col-span-1 row-span-2 h-full w-full object-cover rounded-2xl aspect-[3/5]" />
              <img src={HERO_IMAGES[1]} alt="" className="col-span-1 row-span-2 h-full w-full object-cover rounded-2xl aspect-[3/5]" />
              <img src={HERO_IMAGES[2]} alt="" className="col-span-1 h-full w-full object-cover rounded-2xl aspect-[3/2]" />
              <img src={HERO_IMAGES[3]} alt="" className="col-span-1 h-full w-full object-cover rounded-2xl aspect-[3/2]" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-primary">
                Conheça seu novo perfil
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Você começa sem custo e com todas as ferramentas de faturamento à sua disposição.
              </p>
            </div>

            <ol className="space-y-4 max-w-md mx-auto">
              {[
                "O Perfil será gratuito para seus assinantes.",
                "Perfis gratuitos não viram pagos depois.",
                "Use todas as ferramentas da Monetisexy para faturar.",
              ].map((text, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground">
                  <span className="font-bold text-primary">{i + 1}.</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="relative h-32 w-32 rounded-full bg-muted grid place-items-center overflow-hidden"
                aria-label="Enviar foto de perfil"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-foreground">{initials}</span>
                )}
                <span className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-card border border-border grid place-items-center shadow-card">
                  <Camera className="h-4 w-4 text-foreground" />
                </span>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
            </div>

            <div className="space-y-3">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nome de perfil"
                className="rounded-full bg-muted/60 border-0 h-12 px-5 text-sm"
              />
              <div className="relative">
                <Input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase())}
                  placeholder="monetisexy.com/(seu @)"
                  className="rounded-full bg-muted/60 border-0 h-12 px-5 text-sm"
                />
                {handle.length > 0 && !handleValid && (
                  <p className="text-xs text-destructive mt-1 px-4">
                    Use 3-30 caracteres: letras minúsculas, números, _ ou .
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Escolha uma foto de capa e sua biografia</h3>
              <div className="grid grid-cols-3 gap-2">
                {COVER_OPTIONS.map((url) => {
                  const active = selectedCover === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedCover(url)}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 ${active ? "border-primary" : "border-transparent"}`}
                    >
                      <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      {active && (
                        <span className="absolute inset-0 bg-black/40 grid place-items-center">
                          <span className="h-10 w-10 rounded-full bg-white grid place-items-center">
                            <Camera className="h-4 w-4 text-foreground" />
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="text-xs font-semibold text-primary hover:underline"
              >
                + Enviar sua foto
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={onCoverPick} />
            </div>

            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Biografia"
              className="rounded-2xl bg-muted/60 border-0 min-h-40 p-4 resize-none text-sm"
              maxLength={500}
            />
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full rounded-full bg-primary text-primary-foreground py-4 font-semibold hover:opacity-90 transition"
            >
              Avançar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full rounded-full bg-primary text-primary-foreground py-4 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
            >
              Criar Conta
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
