import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { ArrowLeft, Instagram } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/social-media")({
  head: () => ({
    meta: [
      { title: "Redes Sociais · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) throw redirect({ to: "/entrar" });
    return {};
  },
  component: SettingsSocialMediaPage,
});

const sanitize = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30);

function SettingsSocialMediaPage() {
  const router = useRouter();
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [x, setX] = useState("");
  const dirty = instagram !== "" || tiktok !== "" || x !== "";

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
            Redes Sociais
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-3 pb-28">
        <SocialField
          icon={<Instagram className="h-6 w-6 text-foreground" />}
          value={instagram}
          onChange={(v) => setInstagram(sanitize(v))}
          placeholder="instagram.com/"
        />
        <SocialField
          icon={<TikTokIcon />}
          value={tiktok}
          onChange={(v) => setTiktok(sanitize(v))}
          placeholder="tiktok.com/(seu @)"
        />
        <SocialField
          icon={<XIcon />}
          value={x}
          onChange={(v) => setX(sanitize(v))}
          placeholder="x.com/(seu @)"
        />
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

function SocialField({
  icon,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-muted px-5 py-3">
      <span className="shrink-0 grid place-items-center">{icon}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-0 bg-transparent p-0 h-auto text-base text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
      />
    </label>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-foreground" aria-hidden>
      <path d="M19.6 6.9a5.9 5.9 0 0 1-3.6-1.2 5.9 5.9 0 0 1-2.3-4H10v13.3a2.6 2.6 0 1 1-1.9-2.5V9.3a5.8 5.8 0 1 0 5.6 5.8V9.8a8.9 8.9 0 0 0 5.9 2z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-foreground" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.45L22 22h-6.828l-4.77-6.24L4.8 22H2l7.02-8.02L2 2h6.914l4.3 5.68L18.244 2Zm-2.394 18h1.86L7.24 4H5.26l10.59 16Z" />
    </svg>
  );
}
