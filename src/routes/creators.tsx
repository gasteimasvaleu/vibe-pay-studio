import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { listPublicCreators } from "@/lib/public-directory.functions";

const URL = "https://monetisexy.com/creators";

export const Route = createFileRoute("/creators")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q.slice(0, 60) : undefined,
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => listPublicCreators({ data: { q: deps.q } }),
  head: () => ({
    meta: [
      { title: "Creators · Monetisexy" },
      { name: "description", content: "Conheça os creators da Monetisexy e assine para ver o conteúdo exclusivo de cada um." },
      { property: "og:title", content: "Creators · Monetisexy" },
      { property: "og:description", content: "Conheça os creators da Monetisexy." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: CreatorsPage,
  errorComponent: () => (
    <SiteLayout>
      <p className="py-20 text-center text-muted-foreground">Não foi possível carregar os creators.</p>
    </SiteLayout>
  ),
  notFoundComponent: () => null,
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function CreatorsPage() {
  const creators = Route.useLoaderData();
  const { q } = Route.useSearch();
  return (
    <SiteLayout>
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Creators</h1>
        <p className="mt-2 text-sm text-muted-foreground">Conteúdo para maiores de 18 anos.</p>
        <form method="get" className="mt-6">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome ou @usuário"
            className="w-full md:w-96 h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          />
        </form>
        {creators.length === 0 ? (
          <p className="mt-10 text-muted-foreground">Nenhum creator encontrado.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {creators.map((c) => (
              <Link
                key={c.username}
                to="/c/$username"
                params={{ username: c.username }}
                className="rounded-2xl overflow-hidden border border-border bg-card hover:border-primary transition-colors"
              >
                <div className="aspect-[16/9] bg-muted">
                  {c.cover_url && <img src={c.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </div>
                <div className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0">
                    {c.avatar_url && <img src={c.avatar_url} alt={c.display_name ?? c.username} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{c.display_name ?? c.username}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{c.username}
                      {c.kind === "paid" && c.price_monthly ? ` · ${brl.format(c.price_monthly)}/mês` : " · Grátis"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
