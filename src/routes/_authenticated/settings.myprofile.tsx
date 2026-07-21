import { useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link, useRouter, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
import {
  AlertCircle,
  ArrowLeft,
  AtSign,
  Camera,
  ChevronRight,
  Copy,
  Image as ImageIcon,
  Lock,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AvatarCropDialog } from "@/components/settings/AvatarCropDialog";

export const Route = createFileRoute("/_authenticated/settings/myprofile")({
  head: () => ({
    meta: [
      { title: "Meu perfil · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) throw redirect({ to: "/entrar" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    const username =
      profile?.username ?? user.email?.split("@")[0] ?? "voce";
    return { username, avatarUrl: profile?.avatar_url ?? null };
  },
  component: SettingsMyProfilePage,
});

function SettingsMyProfilePage() {
  const router = useRouter();
  const { username, avatarUrl: initialAvatarUrl } = Route.useRouteContext();
  const displayName =
    username.charAt(0).toUpperCase() + username.slice(1).split(/[._-]/)[0];

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteFn = useServerFn(deleteMyAccount);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
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

  const handleCopyLink = async () => {
    try {
      const baseUrl = import.meta.env.VITE_APP_BASE_URL ?? window.location.origin;
      const link = `${baseUrl}/perfil/${username}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  const handleConfirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteFn({});
    } catch {
      toast.error("Não foi possível excluir a conta");
      setDeleting(false);
      return;
    }
    toast.success("Conta excluída");
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore — usuário já não existe */
    }
    window.location.replace("/");
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
            Meu perfil
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <section className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="h-28 w-28 ring-4 ring-card shadow-card">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-semibold">
                {displayName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
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
              aria-label="Alterar foto"
              className="absolute bottom-1 right-1 h-9 w-9 grid place-items-center rounded-full bg-foreground text-background shadow-md hover:opacity-90 transition-opacity"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{displayName}</p>
            <p className="text-sm text-muted-foreground">@{username}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyLink}
            className="mt-2 h-11 px-6 rounded-md gap-2"
          >
            <Copy className="h-4 w-4" />
            Copiar meu link Monetisexy
          </Button>
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-card">
          <SettingsRow
            icon={<User className="h-5 w-5" />}
            label="Nome de perfil e identificador"
            to="/settings/social"
          />
          <SettingsRow
            icon={<ImageIcon className="h-5 w-5" />}
            label="Foto de capa, biografia e localização"
            to="/settings/details"
          />
          <SettingsRow
            icon={<AtSign className="h-5 w-5" />}
            label="Redes Sociais"
            to="/settings/social-media"
          />
          <SettingsRow
            icon={<Lock className="h-5 w-5" />}
            label="Alterar senha"
            to="/settings/change-password"
          />
          <SettingsRow
            icon={<Trash2 className="h-5 w-5" />}
            label="Excluir conta"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          />
        </section>
      </main>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          className="max-w-sm rounded-3xl border-0 bg-card p-8 shadow-2xl [&>button]:top-4 [&>button]:right-4 [&>button]:h-9 [&>button]:w-9 [&>button]:rounded-full [&>button]:bg-muted [&>button]:grid [&>button]:place-items-center [&>button]:opacity-100"
        >
          <div className="flex flex-col items-center text-center pt-2">
            <div className="h-16 w-16 rounded-full border-[3px] border-primary grid place-items-center mb-5">
              <AlertCircle className="h-9 w-9 text-primary" />
              <span className="sr-only">Atenção</span>
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">
              Deseja continuar?
            </DialogTitle>
            <DialogDescription className="mt-3 text-base text-muted-foreground">
              Ao continuar, sua conta e os dados associados serão excluídos.
            </DialogDescription>

            <div className="mt-8 flex items-center justify-center gap-3 w-full">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="h-12 px-6 rounded-md text-foreground hover:bg-accent"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="h-12 px-8 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Excluindo…" : "Continuar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {cropSrc && (
        <AvatarCropDialog
          imageSrc={cropSrc}
          onCancel={() => setCropSrc(null)}
          onSuccess={(url) => {
            setAvatarUrl(url);
            setCropSrc(null);
            router.invalidate();
          }}
        />
      )}
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  variant,
  to,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  variant?: "destructive";
  to?: string;
  onClick?: () => void;
}) {
  const isDestructive = variant === "destructive";
  const className =
    "flex items-center gap-3 px-4 py-4 hover:bg-accent transition-colors w-full text-left";
  const content = (
    <>
      <span className={isDestructive ? "text-destructive" : "text-foreground"}>
        {icon}
      </span>
      <span
        className={`flex-1 text-base ${
          isDestructive ? "text-destructive font-medium" : "text-foreground"
        }`}
      >
        {label}
      </span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </>
  );
  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick ?? (() => toast.info("Em breve"))}
      className={className}
    >
      {content}
    </button>
  );
}

