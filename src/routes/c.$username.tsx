import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { getPublicCreator } from "@/lib/public-directory.functions";

export const Route = createFileRoute("/c/$username")({
  loader: async ({ params }) => {
    const c = await getPublicCreator({ data: { username: params.username } });
    if (!c) throw notFound();
    return c;
  },
  head: ({ loaderData, params }) => {
    const url = `https://monetisexy.com/c/${params.username}`;
    if (!loaderData) {
      return {
        meta: [{ title: "Perfil indisponível · Monetisexy" }, { name: "robots", content: "noindex" }],
      };
    }
    const name = loaderData.display_name ?? loaderData.username;
    const title = `${name} (@${loaderData.username}) · Monetisexy`;
    const desc = (loaderData.bio ?? `Assine ${name} na Monetisexy.`).slice(0, 160);
    const img = loaderData.cover_url ?? loaderData.avatar_url;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(img && /^https:\/\//.test(img)
          ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            mainEntity: { "@type": "Person", name, alternateName: `@${loaderData.username}`, description: loaderData.bio ?? undefined, image: img ?? undefined },
          }),
        },
      ],
    };
  },
  component: PublicCreatorPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Este perfil não está disponível.</p>
        <Link to="/creators" search={{ q: undefined }} className="mt-4 inline-block text-primary">Ver creators</Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: () => (
    <SiteLayout>
      <p className="py-20 text-center text-muted-foreground">Não foi possível carregar este perfil.</p>
    </SiteLayout>
  ),
});

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function PublicCreatorPage() {
  const c = Route.useLoaderData();
  const name = c.display_name ?? c.username;
  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="rounded-3xl overflow-hidden border border-border bg-card">
          <div className="aspect-[3/1] bg-muted">
            {c.cover_url && <img src={c.cover_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="p-6">
            <div className="-mt-16 h-24 w-24 rounded-full border-4 border-card bg-muted overflow-hidden">
              {c.avatar_url && <img src={c.avatar_url} alt={name} className="h-full w-full object-cover" />}
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground">{name}</h1>
            <p className="text-sm text-muted-foreground">@{c.username}</p>
            {c.bio && <p className="mt-4 text-sm text-foreground whitespace-pre-line">{c.bio}</p>}
            <p className="mt-4 text-sm font-semibold text-foreground">
              {c.kind === "paid" && c.price_monthly ? `Assinatura: ${brl.format(c.price_monthly)}/mês` : "Perfil gratuito"}
            </p>
            <Link
              to="/cadastro"
              className="mt-6 inline-flex h-10 items-center rounded-md bg-gradient-primary px-6 text-sm font-semibold text-primary-foreground"
            >
              {c.kind === "paid" ? "Assinar" : "Ver perfil completo"}
            </Link>
            <p className="mt-6 text-xs text-muted-foreground">Conteúdo para maiores de 18 anos. Crie sua conta ou entre para ver o perfil completo.</p>
          </div>
        </div>
      </article>
    </SiteLayout>
  );
}
