import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/colecoes")({
  head: () => ({
    meta: [
      { title: "Coleções · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: ColecoesPage,
});

type TabKey = "favoritos" | "compras" | "compras_chat" | "ocultados" | "mimos";

const TABS: { key: TabKey; label: string; empty: string }[] = [
  { key: "favoritos", label: "FAVORITOS", empty: "Você ainda não favoritou nenhum post." },
  { key: "compras", label: "MINHAS COMPRAS", empty: "Você ainda não comprou nenhum post." },
  { key: "compras_chat", label: "COMPRAS CHAT", empty: "Você ainda não comprou nada no chat." },
  { key: "ocultados", label: "OCULTADOS", empty: "Você não tem posts ocultos." },
  { key: "mimos", label: "MIMOS", empty: "Você ainda não recebeu mimos." },
];

function ColecoesPage() {
  const router = useRouter();
  const [active, setActive] = useState<TabKey>("favoritos");
  const current = TABS.find((t) => t.key === active)!;

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
          <h1 className="text-base font-semibold text-foreground truncate">Coleções</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex items-center gap-2 md:gap-3 justify-start md:justify-center whitespace-nowrap pb-2">
            {TABS.map((tab) => {
              const isActive = tab.key === active;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActive(tab.key)}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid place-items-center px-4 text-center">
          <p className="text-base md:text-lg font-medium text-foreground">
            {current.empty}
          </p>
        </div>
      </main>
    </div>
  );
}
