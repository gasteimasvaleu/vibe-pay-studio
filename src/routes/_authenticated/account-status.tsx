import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account-status")({
  head: () => ({
    meta: [
      { title: "Personalizar status — monetisex" },
      { name: "description", content: "Defina sua visibilidade no chat." },
    ],
  }),
  component: AccountStatusPage,
});

type StatusKey = "online" | "offline" | "in_chat";

type StatusOption = {
  key: StatusKey;
  title: string;
  subtitle: string;
  iconWrap: string;
  icon: React.ReactNode;
};

const OPTIONS: StatusOption[] = [
  {
    key: "online",
    title: "Online",
    subtitle: "Disponível na plataforma",
    iconWrap: "bg-emerald-100",
    icon: <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />,
  },
  {
    key: "offline",
    title: "Offline",
    subtitle: "Você vê tudo normalmente",
    iconWrap: "bg-muted",
    icon: <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />,
  },
  {
    key: "in_chat",
    title: "No chat",
    subtitle: "Respondendo mensagens agora",
    iconWrap: "bg-primary/10",
    icon: <MessageCircle className="h-4 w-4 text-primary" />,
  },
];

function AccountStatusPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [selected, setSelected] = useState<StatusKey | null>(null);
  const [clearAfter, setClearAfter] = useState<string>("30m");

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: "/chat" });
    }
  };

  const handleSave = () => {
    if (!selected) return;
    try {
      localStorage.setItem(
        "account-status",
        JSON.stringify({ status: selected, clearAfter, updatedAt: Date.now() }),
      );
    } catch {}
    navigate({ to: "/chat" });
  };

  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <AppTopBar />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <div className="relative flex items-center justify-center mb-8">
          <button
            type="button"
            onClick={goBack}
            aria-label="Voltar"
            className="absolute left-0 h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">Personalizar status</h1>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Visibilidade</h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {OPTIONS.map((opt) => {
              const active = selected === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelected(opt.key)}
                  className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-accent/50 transition-colors"
                >
                  <span
                    className={cn(
                      "h-10 w-10 rounded-full grid place-items-center shrink-0",
                      opt.iconWrap,
                    )}
                  >
                    {opt.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-foreground">{opt.title}</span>
                    <span className="block text-sm text-muted-foreground">{opt.subtitle}</span>
                  </span>
                  <span
                    className={cn(
                      "h-6 w-6 rounded-full grid place-items-center shrink-0 transition-colors",
                      active
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "border border-border",
                    )}
                    aria-hidden
                  >
                    {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {selected && selected !== "online" && (
          <section className="space-y-3 mt-8">
            <h2 className="text-sm font-semibold text-foreground">Limpar status após</h2>
            <Select value={clearAfter} onValueChange={setClearAfter}>
              <SelectTrigger className="h-14 rounded-2xl bg-muted border-border px-4 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Não limpar</SelectItem>
                <SelectItem value="30m">30 minutos</SelectItem>
                <SelectItem value="1h">1 hora</SelectItem>
                <SelectItem value="4h">4 horas</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
              </SelectContent>
            </Select>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 mt-10">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            className="rounded-md border-foreground/20 text-foreground hover:bg-accent"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selected}
            className="rounded-md bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
          >
            Definir status
          </Button>
        </div>
      </div>
    </div>
  );
}
