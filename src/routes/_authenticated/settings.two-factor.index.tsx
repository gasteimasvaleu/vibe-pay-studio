import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/two-factor/")({
  head: () => ({
    meta: [
      { title: "Autenticação de Dois Fatores · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: TwoFactorPage,
});

function TwoFactorPage() {
  const router = useRouter();

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
            Autenticação de Dois Fatores
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-4">
          <h2 className="text-base font-bold text-foreground">Status</h2>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden />
            <span className="text-base text-foreground">Não configurada</span>
          </div>
          <Link
            to="/settings/two-factor/setup"
            className="flex items-center justify-center w-full h-12 rounded-md bg-gradient-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Habilitar
          </Link>
        </div>
      </main>
    </div>
  );
}
