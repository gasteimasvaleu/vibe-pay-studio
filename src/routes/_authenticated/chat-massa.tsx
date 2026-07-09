import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Archive,
  ArrowLeft,
  CalendarCheck,
  Image as ImageIcon,
  Images,
  Info,
  Mic,
  Search,
  Smile,
  Tag,
} from "lucide-react";
import { AppTopBar } from "@/components/site/AppTopBar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FilterChip } from "@/components/chat/FilterChip";
import { ComposerIcon } from "@/components/chat/ComposerIcon";

export const Route = createFileRoute("/_authenticated/chat-massa")({
  component: ChatMassaPage,
});

const CONTACT_FILTERS = [
  "Todos",
  "Seguidores",
  "Seguindo",
  "Expirados",
  "Top 100 Compradores",
  "Expiram em 7 Dias",
  "Interações",
  "Top 1000 Compradores",
];

function ChatMassaPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const toggleFilter = (name: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const canContinue = message.trim().length > 0 && activeFilters.size > 0;
  const goBack = () => navigate({ to: "/chat" });

  return (
    <div className="min-h-[100svh] bg-background text-foreground flex flex-col">
      <AppTopBar />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[360px_1fr] min-h-[calc(100svh-56px)]">
        {/* Left: contacts */}
        <aside className="border-r border-border p-6 flex flex-col overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              aria-label="Voltar"
              onClick={goBack}
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold">Mensagem em massa</h2>
          </div>

          <h3 className="text-sm font-semibold text-foreground mb-3">
            Selecione seus contatos
          </h3>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Pesquisar"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {CONTACT_FILTERS.map((f) => (
              <FilterChip
                key={f}
                active={activeFilters.has(f)}
                onClick={() => toggleFilter(f)}
              >
                {f}
              </FilterChip>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-900/50 px-4 py-3">
            <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm text-foreground leading-snug">
              <p className="font-semibold mb-0.5">
                Novo limite de disparos em massa
              </p>
              <p className="text-muted-foreground">
                Você tem até <span className="font-semibold text-foreground">5 disparos</span> hoje. Planeje suas mensagens com antecedência.
              </p>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <Button
              type="button"
              disabled={activeFilters.size === 0}
              className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 font-semibold"
            >
              Aplicar filtro
            </Button>
          </div>
        </aside>

        {/* Right: message */}
        <section className="flex flex-col overflow-hidden">
          <div className="hidden md:block border-b border-border px-6 py-4">
            <h2 className="text-center text-base font-semibold">
              Selecionar usuários para enviar mensagem em massa
            </h2>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-2">
            <h3 className="text-lg font-semibold text-foreground">
              Escreva sua mensagem
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Digite e envie a mensagem em massa para os usuários selecionados.
            </p>
          </div>

          <div className="border-t border-border p-4 space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite uma mensagem"
              className="min-h-14 resize-none border-0 shadow-none focus-visible:ring-0 px-1"
            />

            <div className="border-b border-border" />

            <TooltipProvider delayDuration={200}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <ComposerIcon icon={ImageIcon} label="Adicionar mídia" />
                  <ComposerIcon icon={Mic} label="Gravar um áudio" />
                  <ComposerIcon icon={Archive} label="Adicionar mídia do acervo" />
                  <ComposerIcon icon={CalendarCheck} label="Agendar mensagem" />
                  <ComposerIcon icon={Images} label="Adicionar GIF" />
                  <ComposerIcon icon={Smile} label="Adicionar um emoji" />
                  <ComposerIcon icon={Tag} label="Adicionar tag" />
                </div>
                <Button
                  type="button"
                  disabled={!canContinue}
                  className="rounded-full px-6 h-10 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 font-semibold uppercase tracking-wide"
                >
                  Continuar
                </Button>
              </div>
            </TooltipProvider>
          </div>
        </section>
      </div>
    </div>
  );
}
