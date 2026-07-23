# Criar página /politicadereclamacoes

## Novo arquivo
`src/routes/politicadereclamacoes.tsx` — rota pública com `createFileRoute("/politicadereclamacoes")`.

## Estrutura
- Envolver com `SiteLayout` (Navbar superior + Footer), mesmo padrão das rotas legais existentes.
- `head()` próprio: title "Política de Reclamações — Monetisexy", description, og:title, og:description, og:type "website", og:url, twitter:card/title/description, canonical `https://monetisexy.com/politicadereclamacoes`.
- Container `max-w-3xl mx-auto px-4 md:px-6 py-12 text-foreground` com `h1` + linha "Última atualização: 23/07/2026" em `text-muted-foreground`.
- Componente auxiliar `Secao({ titulo, children })` (mesmo padrão) para as 9 seções.
- Listas com `ul list-disc pl-5` para: Escopo (Seção 3), Diretrizes Gerais (Seção 4), Como Enviar (Seção 5) e sub-prazos da Seção 6.2.
- E-mail `contato@monetysex.com` como `<a href="mailto:...">` na Seção 5 (mantido conforme texto do usuário).

## Footer
Atualizar `src/components/site/Footer.tsx`: trocar o link "Política de Reclamações" (atualmente `href="#"`) para `/politicadereclamacoes` na coluna Legal.

## Conteúdo
Texto exato fornecido pelo usuário nas 9 seções (Introdução; Propósito; Escopo; Diretrizes Gerais; Como Enviar uma Reclamação; Procedimento de Análise; Resultado da Reclamação; Aspectos Regulatórios; Considerações Finais).

## Não fazer
- Nenhuma mudança de backend/dados.
- Nenhuma alteração de outras rotas além do link no Footer.
