import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings/theme")({
  head: () => ({
    meta: [
      { title: "Tema · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: ThemePage,
});

function ThemePage() {
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = (v: boolean) => {
    setDark(v);
    if (v) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
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
            Tema
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground">Modo noturno</p>
            <p className="text-sm text-muted-foreground mt-1">
              {dark
                ? "Interface com cores escuras para melhor conforto visual à noite"
                : "Interface com cores claras para melhor visibilidade durante o dia"}
            </p>
          </div>
          <Switch
            checked={dark}
            onCheckedChange={toggle}
            aria-label="Modo noturno"
          />
        </div>
      </main>
    </div>
  );
}
