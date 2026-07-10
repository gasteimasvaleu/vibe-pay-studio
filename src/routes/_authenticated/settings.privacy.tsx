import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/privacy")({
  head: () => ({
    meta: [
      { title: "Privacidade · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: PrivacyPage,
});

const ITEMS = [
  "Configurações de privacidade",
  "Configurações de envio de e-mails",
  "Perfis silenciados",
];

function PrivacyPage() {
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
            Privacidade
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-card">
          {ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={soon}
              className="flex items-center px-4 py-4 hover:bg-accent transition-colors w-full text-left text-base text-foreground"
            >
              {label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
