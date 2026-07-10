import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Lightbulb,
  Image as ImageIcon,
  Mic,
  Archive,
  Smile,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/chat-settings")({
  head: () => ({
    meta: [
      { title: "Configurações de Chat · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: ChatSettingsPage,
});

function ChatSettingsPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");

  const canSave = enabled && message.trim().length >= 3;

  const onSave = () => {
    if (!canSave) return;
    toast.success("Alterações salvas");
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
            Configurações de Chat
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200 p-4">
          <Lightbulb className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            Aproveite o primeiro contato para se apresentar e oferecer uma
            mídia exclusiva de boas vindas
          </p>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground">
              Habilitar mensagem de boas-vindas
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Sua mensagem de boas-vindas é enviada automaticamente aos novos
              assinantes
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label="Habilitar mensagem de boas-vindas"
          />
        </div>

        {enabled && (
          <div className="rounded-xl bg-muted/60 p-4 space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mín. 3 caracteres"
              rows={5}
              className="w-full bg-transparent border-0 focus:outline-none resize-none text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-4 text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
              <Mic className="h-5 w-5" />
              <Archive className="h-5 w-5" />
              <Smile className="h-5 w-5" />
              <Tag className="h-5 w-5" />
            </div>
          </div>
        )}

        <Button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="w-full rounded-full h-12 text-base"
        >
          Salvar alterações
        </Button>
      </main>
    </div>
  );
}
