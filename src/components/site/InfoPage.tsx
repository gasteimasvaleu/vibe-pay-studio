import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteLayout } from "./Layout";

export type InfoSection = { title: string; paragraphs?: string[]; items?: string[] };

export function InfoPage({
  title,
  intro,
  sections,
  cta,
}: {
  title: string;
  intro: string;
  sections: InfoSection[];
  cta?: { label: string; email?: string };
}) {
  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-foreground">
        <header className="mb-10 pb-10 border-b border-border">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{intro}</p>
        </header>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-bold tracking-tight mb-3">{s.title}</h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {p}
                </p>
              ))}
              {s.items && (
                <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {cta && (
          <div className="mt-12 rounded-3xl border border-border bg-card p-6 text-center">
            {cta.email && (
              <p className="text-sm text-muted-foreground mb-4">
                Ou escreva para{" "}
                <a href={`mailto:${cta.email}`} className="text-primary hover:underline">
                  {cta.email}
                </a>
              </p>
            )}
            <Link
              to="/contato"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 h-11 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </article>
    </SiteLayout>
  );
}

export function infoHead(slug: string, title: string, description: string) {
  const url = `https://monetisexy.com/${slug}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
