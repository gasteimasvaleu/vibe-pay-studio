## Ajustes no CommentsSheet

### Problema
O sheet inferior de comentários está ocupando toda a largura horizontal na versão desktop, e o avatar do usuário logado no rodapé do input está vazio (sem a inicial do nome).

### Solução

1. **Largura do sheet no desktop**
   - Seguir o padrão dos outros sheets do app (`subscriptions.tsx`, `chat.tsx`, `publisher.tsx`), mas com **480px** em vez de 420px.
   - Adicionar à `className` do `SheetContent`:
     ```
     sm:max-w-[480px] sm:mx-auto sm:left-0 sm:right-0
     ```

2. **Inicial do perfil no avatar do input**
   - Adicionar prop `currentUserName?: string` ao componente `CommentsSheet`.
   - Em `feed.tsx`, passar o `username` obtido de `Route.useRouteContext()` para o `CommentsSheet`.
   - No círculo do avatar do rodapé (linha 136), renderizar a primeira letra de `currentUserName` em maiúsculo, com fallback `"?"`, usando o mesmo estilo dos avatares dos comentários (`bg-primary`, texto branco, fonte bold).

### Arquivos alterados
- `src/components/feed/CommentsSheet.tsx`
- `src/routes/_authenticated/feed.tsx`

### Resultado esperado
- No desktop, o sheet de comentários fica centralizado com no máximo 480px de largura.
- O avatar do usuário logado no input de comentário exibe a inicial do nome de perfil quando não houver imagem.