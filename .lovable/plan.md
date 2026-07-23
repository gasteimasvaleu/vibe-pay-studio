# Criar página /termos-e-politicas

## Novo arquivo
`src/routes/termos-e-politicas.tsx` — rota pública usando `createFileRoute("/termos-e-politicas")`.

## Estrutura
- Envolver com `SiteLayout` (`src/components/site/Layout.tsx`) para reutilizar Navbar superior e Footer.
- `head()` próprio: título "Termos e Políticas — Monetisexy", description, og:title, og:description, twitter:card.
- Container `max-w-3xl mx-auto px-4 md:px-6 py-12` com tipografia semântica: `h1` para o título, `h2` para cada seção numerada, `p`, `ul`/`li` para listas, `strong` para termos.
- Data de atualização em destaque (`text-muted-foreground`) logo abaixo do h1.
- E-mail de contato como `<a href="mailto:contato@monetisexy.com">`.
- Estrutura pronta com placeholder de conteúdo — você cola o texto final no arquivo depois.

## Footer
Atualizar `src/components/site/Footer.tsx`: trocar o link "Termos e Políticas" de `#` para `/termos-e-politicas`.

## Não fazer
- Nenhuma mudança de backend/dados.
- Nenhuma alteração em outras rotas.
