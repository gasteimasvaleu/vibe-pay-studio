import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  CheckSquare,
  Image as ImageIcon,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

type TimeRange = "all" | "specific";
type SortOrder = "recent" | "oldest";

type TabKey = "todas" | "publicacoes" | "conversas" | "envios";

const TABS: Array<{
  key: TabKey;
  label: string;
  title: string;
  count: number | null;
  subtitle: string | null;
}> = [
  { key: "todas", label: "Todas as mídias", title: "TODAS AS MÍDIAS", count: 1, subtitle: null },
  { key: "publicacoes", label: "Publicações", title: "PUBLICAÇÕES", count: 1, subtitle: null },
  { key: "conversas", label: "Conversas", title: "CONVERSAS", count: null, subtitle: "Vazio" },
  { key: "envios", label: "Envios", title: "ENVIOS", count: null, subtitle: "Vazio" },
];

const MEDIA_FILTERS = ["TODAS", "FOTO", "VÍDEO", "ÁUDIO", "GIF"] as const;

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Acervo · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/entrar" });
  },
  component: VaultPage,
});

function VaultPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("todas");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<(typeof MEDIA_FILTERS)[number]>("TODAS");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");

  const current = TABS.find((t) => t.key === activeTab)!;
  const isEmptyCategory = activeTab === "conversas" || activeTab === "envios";

  const selectTab = (k: TabKey) => {
    setActiveTab(k);
    setMobileDetail(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,360px)_1fr]">
          {/* Left header */}
          <div
            className={`${mobileDetail ? "hidden md:flex" : "flex"} items-center justify-between px-4 md:px-6 py-3 md:border-r md:border-border`}
          >
            <button
              type="button"
              onClick={() => router.history.back()}
              className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold tracking-wide text-foreground">ACERVO</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Buscar"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Adicionar"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Right header */}
          <div
            className={`${mobileDetail ? "flex" : "hidden md:flex"} items-center justify-between px-4 md:px-6 py-3`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileDetail(false)}
                className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold tracking-wide text-foreground truncate">
                {current.title}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {activeTab === "publicacoes" && (
                <button
                  type="button"
                  className="h-9 w-9 grid place-items-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Selecionar"
                >
                  <CheckSquare className="h-5 w-5" />
                </button>
              )}
              {activeTab === "envios" && (
                <button
                  type="button"
                  className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Adicionar"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,360px)_1fr]">
        {/* Sidebar */}
        <aside
          className={`${mobileDetail ? "hidden md:block" : "block"} md:border-r md:border-border px-4 md:px-6 py-6`}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-bold tracking-wider text-muted-foreground">
              PADRÃO
            </span>
            <button
              type="button"
              className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Ordenar"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          <ul className="space-y-1">
            {TABS.map((t) => {
              const isActive = t.key === activeTab;
              return (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => selectTab(t.key)}
                    className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold truncate">{t.label}</p>
                      {t.count != null ? (
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                          <span>{t.count}</span>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Content */}
        <section
          className={`${mobileDetail ? "block" : "hidden md:block"} px-4 md:px-6 py-6`}
        >
          {isEmptyCategory ? (
            <EmptyCategory />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-sm font-bold tracking-wider text-muted-foreground">
                  MAIS RECENTES
                </span>
                <button
                  type="button"
                  className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Ordenar"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {MEDIA_FILTERS.map((f) => {
                  const isActive = f === mediaFilter;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setMediaFilter(f)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold tracking-wide transition-colors ${
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>

              <div className="py-16 text-center text-sm text-muted-foreground">
                Nenhuma mídia por aqui ainda.
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function EmptyCategory() {
  return (
    <div className="min-h-[420px] grid place-items-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground/70">
        <svg
          width="180"
          height="150"
          viewBox="0 0 180 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <rect x="20" y="30" width="90" height="70" rx="8" fill="currentColor" opacity="0.25" />
          <circle cx="45" cy="55" r="8" fill="currentColor" opacity="0.5" />
          <path d="M25 95 L55 70 L85 90 L105 78 L105 100 L25 100 Z" fill="currentColor" opacity="0.5" />
          <rect x="95" y="15" width="70" height="55" rx="8" fill="currentColor" opacity="0.2" />
          <circle cx="145" cy="42" r="4" fill="currentColor" opacity="0.55" />
          <path d="M138 34 a12 12 0 0 1 0 16 M148 30 a18 18 0 0 1 0 24" stroke="currentColor" strokeWidth="2" opacity="0.55" fill="none" />
          <rect x="80" y="70" width="75" height="60" rx="8" fill="currentColor" opacity="0.3" />
          <path d="M110 95 L135 108 L110 121 Z" fill="currentColor" opacity="0.55" />
        </svg>
        <p className="text-base">Categoria vazia</p>
      </div>
    </div>
  );
}
