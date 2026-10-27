import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Camera, LocateFixed, Loader2, MapPin } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CoverCropDialog } from "@/components/settings/CoverCropDialog";
import { CoverPreviewDialog } from "@/components/settings/CoverPreviewDialog";
import { updateProfileDetails } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/settings/details")({
  head: () => ({
    meta: [
      { title: "Foto de capa, biografia e localização · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw redirect({ to: "/entrar" });

    const { data: account } = await supabase
      .from("profiles_public" as any)
      .select("username, display_name, bio, location, cover_url, avatar_url, active_profile_id, active_view, free_username, free_display_name, free_avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    // Preferir dados do creator_profiles ativo (pago ou gratuito) para avatar/capa/bio.
    let activeCoverUrl: string | null = null;
    let activeAvatarUrl: string | null = null;
    let activeBio: string | null = null;
    let activeDisplayName: string | null = null;
    let activeUsername: string | null = null;
    const { data: creatorProfiles } = await supabase
      .from("creator_profiles")
      .select("id, kind, username, cover_url, avatar_url, bio, display_name")
      .eq("user_id", user.id);
    const rows = (creatorProfiles ?? []) as Array<{
      id: string;
      kind: "paid" | "free";
      username: string;
      cover_url: string | null;
      avatar_url: string | null;
      bio: string | null;
      display_name: string | null;
    }>;
    const cp =
      rows.find((row) => row.id === account?.active_profile_id) ??
      rows.find((row) => row.kind === "paid") ??
      rows[0] ??
      null;
    const hasActiveCreator = !!cp;
    const activeIsPaid = cp?.kind === "paid";
    if (cp) {
      activeCoverUrl = cp?.cover_url ?? null;
      activeAvatarUrl = cp?.avatar_url ?? null;
      activeBio = cp?.bio ?? null;
      activeDisplayName = cp?.display_name ?? null;
      activeUsername = cp?.username ?? null;
    }

    const inFreeView = account?.active_view === "free";
    const username = activeUsername ??
      (inFreeView ? account?.free_username : account?.username) ??
      user.email?.split("@")[0] ??
      "voce";
    const displayName =
      activeDisplayName ??
      (hasActiveCreator && !activeIsPaid ? null : inFreeView ? account?.free_display_name : account?.display_name) ??
      username.charAt(0).toUpperCase() + username.slice(1).split(/[._-]/)[0];

    return {
      coverUrl: hasActiveCreator && !activeIsPaid ? activeCoverUrl : activeCoverUrl ?? account?.cover_url ?? null,
      avatarUrl: hasActiveCreator
        ? activeAvatarUrl ?? (activeIsPaid ? account?.avatar_url ?? null : null)
        : (inFreeView ? account?.free_avatar_url : null) ?? account?.avatar_url ?? null,
      displayName,
      bio: hasActiveCreator && !activeIsPaid ? activeBio ?? "" : activeBio ?? account?.bio ?? "",
      location: account?.location ?? "",
    };
  },
  component: SettingsDetailsPage,
});

const MAX_BIO = 3000;
const MAX_LOCATION = 120;

function SettingsDetailsPage() {
  const router = useRouter();
  const {
    coverUrl: initialCoverUrl,
    avatarUrl,
    displayName,
    bio: initialBio,
    location: initialLocation,
  } = Route.useRouteContext();

  const saveFn = useServerFn(updateProfileDetails);

  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [initial, setInitial] = useState({ bio: initialBio, location: initialLocation });
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const dirty = bio !== initial.bio || location !== initial.location;

  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 10MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.onerror = () => toast.error("Não foi possível ler o arquivo");
    reader.readAsDataURL(file);
  };

  const handleGeolocate = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalização não disponível");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pt-BR&zoom=10`,
            { headers: { Accept: "application/json" } },
          );
          if (!res.ok) throw new Error("reverse geocode failed");
          const json = (await res.json()) as {
            address?: {
              city?: string;
              town?: string;
              village?: string;
              municipality?: string;
              state?: string;
              country?: string;
            };
          };
          const a = json.address ?? {};
          const city = a.city ?? a.town ?? a.village ?? a.municipality ?? "";
          const region = a.state ?? a.country ?? "";
          const label = [city, region].filter(Boolean).join(", ").slice(0, MAX_LOCATION);
          if (!label) {
            toast.error("Não foi possível determinar a localização");
          } else {
            setLocation(label);
          }
        } catch {
          toast.error("Não foi possível obter localização");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Permissão de localização negada");
        } else {
          toast.error("Não foi possível obter localização");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 },
    );
  };

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await saveFn({ data: { bio, location } });
      if (res.ok) {
        toast.success("Perfil atualizado");
        setInitial({ bio: res.bio, location: res.location });
        setBio(res.bio);
        setLocation(res.location);
        router.invalidate();
      }
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setBio(initial.bio);
    setLocation(initial.location);
  };

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
            Foto de capa, biografia e localização
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={handlePickFile}
          className="relative w-full h-40 md:h-48 rounded-2xl bg-gradient-to-b from-muted to-foreground/70 grid place-items-center overflow-hidden"
          aria-label="Alterar foto de capa"
        >
          {coverUrl && (
            <img
              src={coverUrl}
              alt="Foto de capa"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <span className="relative h-14 w-14 rounded-full bg-foreground text-background grid place-items-center shadow-md">
            <Camera className="h-6 w-6" />
          </span>
        </button>

        <div className="group rounded-2xl border border-transparent bg-muted/60 px-5 py-4 transition-colors hover:bg-muted/40 hover:border-border focus-within:bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
          <label className="block text-xs text-muted-foreground transition-colors group-focus-within:text-primary">
            Sobre Mim
          </label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
            maxLength={MAX_BIO}
            className="mt-1 border-0 bg-transparent p-0 min-h-[180px] resize-none text-base text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <p className="text-xs text-muted-foreground text-right">
            {bio.length} / {MAX_BIO}
          </p>
        </div>

        <div className="space-y-2">
          <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-muted/60 px-5 py-3 transition-colors hover:bg-muted/40 hover:border-border focus-within:bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0 transition-colors group-focus-within:text-primary" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value.slice(0, MAX_LOCATION))}
              placeholder="Localização"
              maxLength={MAX_LOCATION}
              className="border-0 bg-transparent p-0 h-auto text-base text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading}
              aria-label="Usar minha localização atual"
              className="h-9 w-9 shrink-0 grid place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-60 transition-colors"
            >
              {geoLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LocateFixed className="h-5 w-5" />
              )}
            </button>
          </label>
          <p className="text-xs text-muted-foreground px-1">
            Sua localização será exibida abaixo da biografia no seu perfil
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Salvando…" : "Salvar"}
          </Button>
          <Button
            type="button"
            onClick={handleCancel}
            disabled={!dirty || saving}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Cancelar
          </Button>
        </div>
      </main>

      {cropSrc && (
        <CoverCropDialog
          imageSrc={cropSrc}
          onCancel={() => setCropSrc(null)}
          onCropped={(dataUrl) => {
            setCropSrc(null);
            setPreviewSrc(dataUrl);
          }}
        />
      )}

      {previewSrc && (
        <CoverPreviewDialog
          coverDataUrl={previewSrc}
          avatarUrl={avatarUrl}
          displayName={displayName}
          onCancel={() => setPreviewSrc(null)}
          onReplaceCover={() => {
            const src = previewSrc;
            setPreviewSrc(null);
            setCropSrc(src);
          }}
          onSuccess={(url) => {
            setCoverUrl(url);
            setPreviewSrc(null);
            router.invalidate();
          }}
        />
      )}
    </div>
  );
}
