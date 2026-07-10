import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/security")({
  head: () => ({
    meta: [
      { title: "Autenticação por rede social · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: SecurityPage,
});

type Provider = {
  id: string;
  name: string;
  connected: boolean;
  icon: JSX.Element;
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
    <path fill="#34A853" d="M3.9 7.3l3.2 2.3C8 7.9 9.8 6.7 12 6.7c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.9 14.6 3 12 3 8.1 3 4.8 5 3.9 7.3z" opacity="0"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden>
    <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.86l-5.37-6.98L4.1 22H.84l8.03-9.17L1.5 2h6.98l4.85 6.4L18.244 2zm-1.2 18h1.9L7.05 4H5.05l12 16z"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden>
    <path d="M16.365 1.43c0 1.14-.44 2.23-1.17 3.02-.78.85-2.03 1.5-3.05 1.42-.13-1.1.42-2.24 1.13-3.04.79-.87 2.13-1.5 3.09-1.4zM20.5 17.1c-.56 1.28-.83 1.86-1.55 3-.99 1.58-2.39 3.55-4.13 3.57-1.55.02-1.95-1.02-4.05-1-2.1.02-2.54 1.02-4.09.99-1.74-.03-3.06-1.8-4.05-3.38C-.05 16.55-.34 11.2 1.9 8.34c1.6-2.04 4.13-3.24 6.5-3.24 2.42 0 3.94 1.32 5.94 1.32 1.95 0 3.13-1.32 5.93-1.32 2.12 0 4.36 1.15 5.96 3.15-5.24 2.87-4.39 10.35-1.72 8.85z"/>
  </svg>
);

const PROVIDERS: Provider[] = [
  { id: "google", name: "Google", connected: true, icon: <GoogleIcon /> },
  { id: "twitter", name: "Twitter", connected: false, icon: <XIcon /> },
  { id: "apple", name: "Apple", connected: false, icon: <AppleIcon /> },
];

function SecurityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-10 border-b border-border backdrop-blur-md bg-card/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">
            Autenticação por rede social
          </h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-4">
          <h2 className="text-base font-bold text-foreground">
            Autenticação por rede social
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toast.info("Em breve")}
                className="flex items-center justify-center gap-2 rounded-full bg-background/60 hover:bg-background px-5 py-3 text-sm text-foreground border border-border transition-colors"
              >
                {p.icon}
                <span>
                  {p.name} · {p.connected ? "conectado" : "não conectado"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
