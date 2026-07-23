# Criar página /centro-e-seguranca

## Novo arquivo
`src/routes/centro-e-seguranca.tsx` — rota pública com `createFileRoute("/centro-e-seguranca")`.

## Estrutura
- Envolver com `SiteLayout` para reutilizar Navbar superior + Footer (mesmo padrão de `/termos-e-politicas` e `/privacidade`).
- `head()` próprio: title "Centro de Segurança e Transparência — Monetisexy", description, og:title, og:description, og:type, og:url, twitter:card, twitter:title, twitter:description, canonical `https://monetisexy.com/centro-e-seguranca`.
- Container `max-w-3xl mx-auto px-4 md:px-6 py-12 text-foreground`.
- `h1` com título + linha "Última atualização: 23/07/2026" em `text-muted-foreground`.
- Componente auxiliar `Secao({ titulo, children })` (mesmo padrão do arquivo de termos) para cada uma das 13 seções, renderizando `h2` + parágrafos/listas.
- Listas com `ul` + `list-disc pl-5` para itens de Valores (Seção 2), Compromisso com Segurança (Seção 4) e Canais de Denúncia (Seção 13).
- Link interno para `/privacidade` no lugar do placeholder "[Política de Privacidade]" na Seção 9, usando `<Link to="/privacidade">`.
- E-mail `contato@monetisexy.com` como `<a href="mailto:...">` na Seção 13.

## Footer
Atualizar `src/components/site/Footer.tsx`: trocar o link "Centro de Segurança" (atualmente `href="#"`) para `/centro-e-seguranca` na coluna Legal.

## Conteúdo
Texto exato fornecido pelo usuário nas 13 seções (Introdução; Missão, Visão e Valores; Monitoramento de Conteúdo; Compromisso com Segurança; Verificação de Idade e Identidade; Jurisdição; Proteção Contra Abuso de Menores; Direitos Autorais; Privacidade do Usuário; Prevenção a Fraude e Lavagem de Dinheiro; Discurso de Ódio; Prevenção a Trabalho Escravo e Tráfico de Pessoas; Canais de Denúncia e Contato).

## Não fazer
- Nenhuma mudança de backend/dados.
- Nenhuma alteração de outras rotas além do link no Footer.
