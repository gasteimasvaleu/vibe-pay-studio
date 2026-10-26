import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://monetisexy.com";
const STATIC = [
  "/", "/como-funciona", "/sobre", "/contato", "/creators", "/privacidade",
  "/termos-e-politicas", "/centro-e-seguranca", "/politicadereclamacoes", "/dmca",
  "/imprensa", "/uso-da-marca", "/parcerias", "/agencias",
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { fetchDirectory } = await import("@/lib/public-directory.server");
        const creators = [];
        for (let offset = 0; ; offset += 1000) {
          const page = await fetchDirectory(null, 1000, offset);
          creators.push(...page);
          if (page.length < 1000) break;
        }
        const urls = [
          ...STATIC.map((p) => `  <url><loc>${BASE}${p === "/" ? "/" : p}</loc></url>`),
          ...creators.map(
            (c) =>
              `  <url><loc>${BASE}/c/${esc(encodeURIComponent(c.username))}</loc><lastmod>${c.updated_at.slice(0, 10)}</lastmod></url>`,
          ),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
