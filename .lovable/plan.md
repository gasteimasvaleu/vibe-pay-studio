# Criar página /privacidade

## Novo arquivo
`src/routes/privacidade.tsx` — rota pública usando `createFileRoute("/privacidade")`.

## Estrutura
- Envolver com `SiteLayout` (`src/components/site/Layout.tsx`) para reutilizar a `Navbar` superior e o `Footer` da home.
- `head()` com título/descrição próprios ("Política de Privacidade — Monetisexy") e `robots: index`.
- Container `max-w-3xl mx-auto px-4 md:px-6 py-12` com tipografia semântica: `h1` para o título, `h2` para cada seção numerada (1–15), `p`, `ul`/`li` para as listas de bullets, `strong` para termos definidos.
- Data de atualização em destaque (`text-muted-foreground`) logo abaixo do h1.
- E-mail de contato como `<a href="mailto:contato@monetisexy.com">`.

## Conteúdo
Renderizar exatamente o texto fornecido pelo usuário, preservando a numeração das seções e os itens de lista. Sem alterações editoriais.

## Não fazer
- Nenhuma mudança no `Footer` (o link "Privacidade" segue como `#`; se quiser apontar para `/privacidade` depois, é um ajuste separado).
- Nenhuma mudança de backend/dados.
