import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/device-management/removed")({
  head: () => ({
    meta: [
      { title: "Acessos removidos · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: RemovedDevicesPage,
});

function RemovedDevicesPage() {
  const router = useRouter();

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
            Acessos removidos
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-start gap-3 rounded-2xl bg-primary/10 p-4">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">
            Nenhum acesso removido até agora. Assim que houver, você verá o histórico aqui.
          </p>
        </div>
      </main>
    </div>
  );
}
