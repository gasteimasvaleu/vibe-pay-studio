## O que será feito

Remover a antiga barra superior do feed, já que o componente `TopNav` global agora fornece a navegação superior em todas as páginas autenticadas.

## Mudanças

1. **Remover o header antigo** em `src/routes/_authenticated/feed.tsx`:
   - Excluir o bloco `<header>` que continha logo, busca, notificações, mensagens, botão Sair e avatar.
   - Remover imports e helpers que só eram usados por ele: `useState`, `Search`, `Bell`, `MessageCircle` e `IconButton`.
   - Manter o conteúdo principal (`<main>`) e o restante da página intactos.

## Resultado esperado

O feed renderiza apenas o `TopNav` global e o conteúdo da página, sem a barra superior duplicada.