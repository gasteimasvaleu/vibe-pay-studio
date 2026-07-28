## Objetivo

Mostrar o avatar real do usuário logado no campo "Adicione um comentário..." do `CommentsSheet`, em vez do círculo com a inicial.

## Mudanças

1. **`src/components/feed/CommentsSheet.tsx`**
   - Adicionar prop opcional `currentUserAvatarUrl?: string | null`.
   - No bloco do input (linha 433), renderizar `<img>` quando a URL existir, com `object-cover` e `rounded-full`; manter o círculo com a inicial como fallback (inclusive em `onError`).

2. **`src/routes/_authenticated/feed.tsx`**
   - Passar `currentUserAvatarUrl={avatarUrl}` para `<CommentsSheet />` (o `avatarUrl` já está disponível em `Route.useRouteContext()`).

Nenhuma mudança de backend/schema é necessária — `profiles.avatar_url` já é carregado no `beforeLoad` da rota.

## Verificação

- Typecheck.
- Abrir uma publicação no `/feed`, abrir os comentários e conferir que o avatar do usuário logado aparece ao lado do input.
