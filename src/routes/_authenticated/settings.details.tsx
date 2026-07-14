import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { ArrowLeft, Camera, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/details")({
  head: () => ({
    meta: [
      { title: "Foto de capa, biografia e localização · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) throw redirect({ to: "/entrar" });
    return {};
  },
  component: SettingsDetailsPage,
});

const MAX_BIO = 3000;

function SettingsDetailsPage() {
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const initialBio = "";
  const initialLocation = "";
  const dirty = bio !== initialBio || location !== initialLocation;

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
            Foto de capa, biografia e localização
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4 pb-28">
        <button
          type="button"
          onClick={() => toast.info("Em breve")}
          className="relative w-full h-40 md:h-48 rounded-2xl bg-gradient-to-b from-muted to-foreground/70 grid place-items-center overflow-hidden"
          aria-label="Alterar foto de capa"
        >
          <span className="h-14 w-14 rounded-full bg-foreground text-background grid place-items-center shadow-md">
            <Camera className="h-6 w-6" />
          </span>
        </button>

        <div className="rounded-2xl bg-muted px-5 py-4">
          <label className="block text-xs text-muted-foreground">
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
          <label className="flex items-center gap-3 rounded-2xl bg-muted px-5 py-3">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Localização"
              className="border-0 bg-transparent p-0 h-auto text-base text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            />
          </label>
          <p className="text-xs text-muted-foreground px-1">
            Sua localização será exibida abaixo da biografia no seu perfil
          </p>
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3 z-20">
        <div className="max-w-3xl mx-auto">
          <Button
            type="button"
            disabled={!dirty}
            onClick={() => toast.info("Em breve")}
            className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground disabled:opacity-60"
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
