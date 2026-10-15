# Fase 1 — Fundação técnica de SEO

Escopo aprovado: apenas a Fase 1 do plano de crescimento. Nada de páginas novas, hero, diretório de creators ou textos de marketing nesta etapa.

## O que será feito

1. **`public/robots.txt`** — permitir rastreadores (User-agent: * / Allow: /) e apontar o sitemap de https://monetisexy.com.
2. **Sitemap** — lista das páginas públicas existentes (home, páginas institucionais como /privacidade, /termos-e-politicas, /centro-e-seguranca, /politicadereclamacoes, DMCA, /sobre), usando o gerador do projeto se já houver; sem `<lastmod>` inventado.
3. **Favicon** — derivar do logo/ícone da marca, salvar em `public/`, referenciar no root (`head().links`) e remover o favicon padrão.
4. **Google Search Console** — conectar sua conta Google ao projeto, gerar a marca de verificação, colocá-la no `<head>` da home, publicar, verificar o monetisexy.com e enviar o sitemap.
5. **Publicar** — as mudanças só chegam ao site real depois de publicar; a publicação acontece uma única vez, já com a marca de verificação incluída.

## O que NÃO entra nesta fase

- Home pública, página SEO, diretório de creators, metadata avançado por rota (Fase 2).
- Captação de creators e contato com sites de comparativo (Fases 3–4).

## Detalhes técnicos

- `robots.txt` em `public/robots.txt`; sitemap servido em `/sitemap.xml` no domínio publicado.
- Verificação do Search Console pelo método META (tag no head da home); sem mexer em DNS.
- Após publicar: verificar a tag no HTML ao vivo, confirmar a propriedade no Search Console e enviar o sitemap.
