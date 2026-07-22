import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Archive, Image as ImageIcon, Lightbulb, Mic, Smile, Tag } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/chat-configuracoes")({
  component: ChatSettingsPage,
});

function ChatSettingsPage() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");

  const canSave = enabled && message.trim().length >= 3;

  return (
    <div className="min-h-[100svh] bg-background text-foreground flex flex-col">
      <AppTopBar />
      <header className="relative h-14 flex items-center justify-center border-b border-border px-4">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navigate({ to: "/chat" })}
          className="absolute left-3 h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-foreground truncate">Configurações</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
          <div className="flex items-start gap-3 rounded-xl bg-accent/40 border border-border p-4">
            <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 grid place-items-center shrink-0">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              Aproveite o primeiro contato para se apresentar e oferecer uma mídia
              exclusiva de boas vindas.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">
                Habilitar mensagem de boas-vindas
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Sua mensagem de boas-vindas é enviada automaticamente aos novos assinantes
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mín. 3 caracteres"
                className="min-h-32 resize-none border-0 shadow-none focus-visible:ring-0 px-2 py-1 bg-transparent"
              />
              <TooltipProvider delayDuration={200}>
                <div className="flex items-center gap-1 px-1">
                  <ComposerIcon icon={ImageIcon} label="Adicionar mídia" />
                  <ComposerIcon icon={Mic} label="Gravar um áudio" />
                  <ComposerIcon icon={Archive} label="Adicionar mídia do acervo" />
                  <ComposerIcon icon={Smile} label="Adicionar um emoji" />
                  <ComposerIcon icon={Tag} label="Adicionar tag" />
                </div>
              </TooltipProvider>
            </div>
          )}

          <Button
            type="button"
            disabled={!canSave}
            className={cn(
              "w-full h-12 rounded-md font-semibold",
              "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95",
            )}
          >
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}

function ComposerIcon({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
        >
          <Icon className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
