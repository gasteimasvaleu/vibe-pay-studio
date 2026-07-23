# Criar página /dmca

## Novo arquivo
`src/routes/dmca.tsx` — rota pública com `createFileRoute("/dmca")`.

## Estrutura
- Envolver com `SiteLayout` (Navbar superior + Footer), mesmo padrão das rotas legais existentes.
- `head()` próprio: title "Política de Direitos Autorais (DMCA) — Monetisexy", description, og:title, og:description, og:type "website", og:url `https://monetisexy.com/dmca`, twitter:card/title/description, canonical `https://monetisexy.com/dmca`.
- Container `max-w-3xl mx-auto px-4 md:px-6 py-12 text-foreground` com `h1` + linha "Última atualização: 23/07/2026" em `text-muted-foreground`.
- Componente auxiliar `Secao({ titulo, children })` (mesmo padrão das outras páginas legais) para as 9 seções.
- Listas com `ul list-disc pl-5` para: Seção 4 (diretrizes), Seção 5.2 (requisitos de remoção por terceiros retratados), Seção 7 (como notificar) e Seção 8 (contranotificação).
- E-mail `contato@monetisexy.com` como `<a href="mailto:...">` nas Seções 7 e 8.

## Footer
Atualizar `src/components/site/Footer.tsx`: trocar o link "DMCA" (atualmente `href="#"`) para `/dmca` na coluna Legal.

## Conteúdo
Texto exato fornecido pelo usuário nas 9 seções (Introdução; Propósito; Escopo; Diretrizes Gerais; Pedido de Remoção por Terceiros Retratados em Conteúdo; Conteúdo Íntimo Não Consentido; Como Notificar uma Violação; Contranotificação; Considerações Finais).

## Não fazer
- Nenhuma mudança de backend/dados.
- Nenhuma alteração de outras rotas além do link no Footer.