import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Laptop, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/settings/security-menu")({
  head: () => ({
    meta: [
      { title: "Segurança · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: SecurityMenuPage,
});

type Session = {
  id: string;
  device: string;
  location: string;
  date: string;
  meta: string;
};

const SESSIONS: Session[] = [
  {
    id: "1",
    device: "Chrome",
    location: "João Pessoa, PB, BR",
    date: "10 Jul 2026, 05:45",
    meta: "168.0.235.20 - Chrome",
  },
  {
    id: "2",
    device: "Chrome",
    location: "João Pessoa, PB, BR",
    date: "09 Jul 2026, 22:12",
    meta: "168.0.235.20 - Chrome",
  },
];

function SecurityMenuPage() {
  const router = useRouter();
  const soon = () => toast.info("Em breve");

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
            Segurança
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-8">
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-card">
          {[
            { label: "Alterar senha", to: "/settings/change-password" },
            { label: "Autenticação de dois fatores" },
            { label: "Autenticação por rede social" },
          ].map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className="flex items-center px-4 py-4 hover:bg-accent transition-colors w-full text-left text-base text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={soon}
                className="flex items-center px-4 py-4 hover:bg-accent transition-colors w-full text-left text-base text-foreground"
              >
                {item.label}
              </button>
            )
          )}
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Seus acessos</h2>
            <p className="text-sm text-muted-foreground">
              Acessos conectados recentemente
            </p>
          </div>

          <div className="space-y-3">
            {SESSIONS.map((s) => (
              <div
                key={s.id}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="h-10 w-10 grid place-items-center text-muted-foreground shrink-0">
                  <Laptop className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-foreground">{s.device}</p>
                  <p className="text-sm font-semibold text-foreground">{s.location}</p>
                  <p className="text-sm text-foreground">{s.date}</p>
                  <p className="text-sm text-muted-foreground">{s.meta}</p>
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
                    <DropdownMenuItem onClick={soon}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={soon}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover acesso
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          <Link
            to="/settings/device-management"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-accent transition-colors w-full text-left"
          >
            <span className="flex-1 text-base text-foreground">Ver todos acessos</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </section>
      </main>
    </div>
  );
}
