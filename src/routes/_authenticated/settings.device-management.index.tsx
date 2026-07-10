import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Laptop, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/settings/device-management/")({
  head: () => ({
    meta: [
      { title: "Seus acessos · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DeviceManagementPage,
});

type Session = {
  id: string;
  device: string;
  location: string;
  date: string;
  meta: string;
};

const CURRENT: Session = {
  id: "current",
  device: "Chrome",
  location: "João Pessoa, PB, BR",
  date: "10 Jul 2026, 05:45",
  meta: "168.0.235.20 - Chrome",
};

const OTHERS: Session[] = [
  {
    id: "1",
    device: "Chrome",
    location: "João Pessoa, PB, BR",
    date: "10 Jul 2026, 04:55",
    meta: "168.0.235.20 - Chrome",
  },
  {
    id: "2",
    device: "Chrome",
    location: "João Pessoa, PB, BR",
    date: "09 Jul 2026, 22:12",
    meta: "168.0.235.20 - Chrome",
  },
  {
    id: "3",
    device: "Safari",
    location: "Recife, PE, BR",
    date: "08 Jul 2026, 14:30",
    meta: "191.5.120.44 - Safari",
  },
  {
    id: "4",
    device: "Firefox",
    location: "São Paulo, SP, BR",
    date: "05 Jul 2026, 10:02",
    meta: "200.148.30.11 - Firefox",
  },
];

function DeviceManagementPage() {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const soon = () => toast.info("Em breve");

  const visible = showAll ? OTHERS : OTHERS.slice(0, 2);
  const hasMore = OTHERS.length > 2;

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
            Seus acessos
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">Acessos conectados</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Estes são todos os acessos conectados à sua conta. Caso não reconheça algum deles, remova todos os acessos e{" "}
            <button
              type="button"
              onClick={soon}
              className="underline text-muted-foreground hover:text-foreground"
            >
              troque sua senha
            </button>{" "}
            para mais segurança
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground">Acesso atual</h3>
          <SessionCard session={CURRENT} onAction={soon} />
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground">Outros acessos</h3>
          <div className="space-y-3">
            {visible.map((s) => (
              <SessionCard key={s.id} session={s} onAction={soon} />
            ))}
          </div>
        </section>

        {hasMore && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-accent transition-colors text-base font-semibold text-foreground text-center"
          >
            Ver mais
          </button>
        )}

        <button
          type="button"
          onClick={soon}
          className="w-full rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-accent transition-colors text-base font-semibold text-destructive text-center"
        >
          Remover todos os acessos
        </button>

        <Link
          to="/settings/device-management/removed"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-accent transition-colors w-full text-left"
        >
          <span className="flex-1 text-base text-foreground">Ver acessos removidos</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </main>
    </div>
  );
}

function SessionCard({ session, onAction }: { session: Session; onAction: () => void }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="h-10 w-10 grid place-items-center text-muted-foreground shrink-0">
        <Laptop className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-foreground">{session.device}</p>
        <p className="text-sm font-semibold text-foreground">{session.location}</p>
        <p className="text-sm text-foreground">{session.date}</p>
        <p className="text-sm text-muted-foreground">{session.meta}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Opções"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onAction}>
            <Pencil className="h-4 w-4 mr-2" />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onAction}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover acesso
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
