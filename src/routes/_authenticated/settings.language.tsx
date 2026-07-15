import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/language")({
  head: () => ({
    meta: [
      { title: "Idioma · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: LanguagePage,
});

const LANGUAGES = [
  { value: "en", label: "Inglês", flag: "🇺🇸" },
  { value: "pt", label: "Português", flag: "🇧🇷" },
  { value: "es", label: "Espanhol", flag: "🇪🇸" },
];

function LanguagePage() {
  const router = useRouter();
  const [initial, setInitial] = useState("pt");
  const [value, setValue] = useState("pt");

  const canSave = value !== initial;

  const onSave = () => {
    if (!canSave) return;
    setInitial(value);
    toast.success("Idioma atualizado");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
            Idioma
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 py-6 flex flex-col">
        <div className="rounded-md bg-muted/60 px-5 py-3">
          <p className="text-xs text-muted-foreground">Escolha seu idioma</p>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="border-0 shadow-none bg-transparent h-8 p-0 focus:ring-0 text-base font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  <span className="mr-2">{l.flag}</span>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-auto pt-6">
          <Button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="w-full rounded-md h-12 text-base"
          >
            Salvar
          </Button>
        </div>
      </main>
    </div>
  );
}
