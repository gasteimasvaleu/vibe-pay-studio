import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createFreeCreatorProfile } from "@/lib/onboarding.functions";
import heroA from "@/assets/free-profile-hero-1.jpg";
import heroB from "@/assets/free-profile-hero-2.jpg";
import heroC from "@/assets/free-profile-hero-3.jpg";
import heroD from "@/assets/free-profile-hero-4.jpg";
import coverB from "@/assets/free-profile-cover-2.jpg";
import coverC from "@/assets/free-profile-cover-3.jpg";

export const Route = createFileRoute("/_authenticated/criar-perfil-gratuito")({
  head: () => ({
    meta: [
      { title: "Criar perfil gratuito · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: CriarPerfilGratuitoPage,
});

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;
const COVER_OPTIONS = [coverB, coverC];
const HERO_IMAGES = [heroA, heroB, heroC, heroD];

type UploadKind = "avatar" | "cover";

async function uploadToBucket(
  bucket: "avatars" | "covers",
  file: File,
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("sessão expirada");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const safeExt = /^(jpg|jpeg|png|webp)$/.test(ext) ? ext : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${safeExt}`;
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
  if (upErr) throw new Error(upErr.message);
  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr || !signed) {
    await supabase.storage.from(bucket).remove([path]);
    throw new Error(signErr?.message ?? "falha ao gerar URL");
  }
  return signed.signedUrl;
}

function CriarPerfilGratuitoPage() {
  const navigate = useNavigate();
  const createProfile = useServerFn(createFreeCreatorProfile);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [accountType, setAccountType] = useState<
    "subscriber" | "creator" | "free_creator" | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("account_type, free_username")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (cancelled) return;
      setAccountType(
        (p?.account_type ?? "subscriber") as
          | "subscriber"
          | "creator"
          | "free_creator",
      );
      if (p?.free_username) setHandle(p.free_username);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLinkedMode = accountType === "creator";

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedCover, setSelectedCover] = useState<string>(COVER_OPTIONS[0]);
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleValid = /^[a-z0-9_.]{3,30}$/.test(handle.trim().toLowerCase());
  const canSubmit =
    displayName.trim().length > 0 &&
    handleValid &&
    !submitting &&
    uploading === null;

  const initials =
    (displayName.trim() || "CA")
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "CA";

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setUploading("avatar");
    try {
      const url = await uploadToBucket("avatars", file);
      setAvatarUrl(url);
    } catch (err) {
      setAvatarPreview(null);
      setAvatarUrl(null);
      toast.error((err as Error).message ?? "falha ao enviar avatar");
    } finally {
      setUploading((k) => (k === "avatar" ? null : k));
    }
  };

  const onCoverPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setSelectedCover(localPreview);
    setUploading("cover");
    try {
      const url = await uploadToBucket("covers", file);
      setSelectedCover(url);
    } catch (err) {
      setSelectedCover(COVER_OPTIONS[0]);
      toast.error((err as Error).message ?? "falha ao enviar capa");
    } finally {
      setUploading((k) => (k === "cover" ? null : k));
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const coverUrl =
        selectedCover && /^https?:\/\//i.test(selectedCover)
          ? selectedCover
          : selectedCover && selectedCover.startsWith("/")
            ? `${window.location.origin}${selectedCover}`
            : null;
      await createProfile({
        data: {
          handle: handle.trim().toLowerCase(),
          displayName: displayName.trim(),
          bio: bio.trim() || null,
          avatarUrl,
          coverUrl,
        },
      });
      toast.success(
        isLinkedMode
          ? "Perfil gratuito ativado! Você está no modo assinante."
          : "Perfil criado!",
      );
      navigate({ to: "/dashboard" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao criar perfil";
      if (msg === "handle_taken") toast.error("Este @ já está em uso.");
      else toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-center border-b border-border bg-background/90 px-4 py-4 backdrop-blur">
        <button
          type="button"
          onClick={() => (step === 1 ? navigate({ to: "/dashboard" }) : setStep(1))}
          aria-label="Voltar"
          className="absolute left-4 h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-foreground truncate">
          {step === 1
            ? isLinkedMode
              ? "Ativar perfil gratuito"
              : "Crie seu perfil gratuito"
            : "Personalizando perfil"}
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-44">
        {step === 1 ? (
          <section className="space-y-8">
            <div className="grid grid-cols-3 gap-2">
              <img src={HERO_IMAGES[0]} alt="" loading="lazy" className="col-span-1 row-span-2 h-full w-full object-cover rounded-2xl aspect-[3/5]" />
              <img src={HERO_IMAGES[1]} alt="" loading="lazy" className="col-span-1 row-span-2 h-full w-full object-cover rounded-2xl aspect-[3/5]" />
              <img src={HERO_IMAGES[2]} alt="" loading="lazy" className="col-span-1 h-full w-full object-cover rounded-2xl aspect-[3/2]" />
              <img src={HERO_IMAGES[3]} alt="" loading="lazy" className="col-span-1 h-full w-full object-cover rounded-2xl aspect-[3/2]" />
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
                disabled={uploading === "avatar"}
                className="relative h-32 w-32 rounded-full bg-muted grid place-items-center overflow-hidden disabled:opacity-70"
                aria-label="Enviar foto de perfil"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-foreground">{initials}</span>
                )}
                {uploading === "avatar" && (
                  <span className="absolute inset-0 bg-black/40 grid place-items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </span>
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
                className="rounded-md bg-muted/60 border-0 h-12 px-5 text-sm"
              />
              <div className="relative">
                <div className="flex items-center rounded-md bg-muted/60 h-12 pl-5 pr-2 text-sm focus-within:ring-2 focus-within:ring-ring">
                  <span className="select-none text-muted-foreground pr-0.5">monetisexy.com/</span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase())}
                    placeholder="seuusuario"
                    className="flex-1 bg-transparent border-0 outline-none h-full text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                {handle.length > 0 && !handleValid && (
                  <p className="text-xs text-destructive mt-1 px-4">
                    Use 3-30 caracteres: letras minúsculas, números, _ ou .
                  </p>
                )}
                {isLinkedMode && (
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    Este @ será o endereço público do seu perfil gratuito, separado do seu @ de creator.
                  </p>
                )}
              </div>


            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Escolha uma foto de capa e sua biografia</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploading === "cover"}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 bg-muted ${
                    selectedCover && !COVER_OPTIONS.includes(selectedCover)
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                  aria-label="Enviar sua foto de capa"
                >
                  {selectedCover && !COVER_OPTIONS.includes(selectedCover) && (
                    <img
                      src={selectedCover}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="h-10 w-10 rounded-full bg-card grid place-items-center shadow-card">
                      <Camera className="h-4 w-4 text-foreground" />
                    </span>
                  </span>
                  {uploading === "cover" && (
                    <span className="absolute inset-0 bg-black/40 grid place-items-center">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </span>
                  )}
                </button>
                {COVER_OPTIONS.map((url) => {
                  const active = selectedCover === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedCover(url)}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 ${active ? "border-primary" : "border-transparent"}`}
                    >
                      <img src={url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      {active && (
                        <span className="absolute inset-0 bg-black/40 grid place-items-center">
                          <span className="h-10 w-10 rounded-full bg-card grid place-items-center">
                            <Camera className="h-4 w-4 text-foreground" />
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
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

      <footer className="fixed bottom-20 inset-x-0 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full rounded-md bg-primary text-primary-foreground py-4 font-semibold hover:opacity-90 transition"
            >
              Avançar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full rounded-md bg-primary text-primary-foreground py-4 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting
                ? (isLinkedMode ? "Ativando..." : "Criando...")
                : (isLinkedMode ? "Ativar perfil gratuito" : "Criar Conta")}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
