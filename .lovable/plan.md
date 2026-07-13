## Objetivo

Permitir que tanto o autor do comentário quanto o autor da publicação (dono do perfil) possam excluir um comentário no sheet de comentários.

## Contexto

- A política RLS já permite: `DELETE` em `publication_comments` para `auth.uid() = user_id` OU `auth.uid()` = autor da publicação. Não precisa mexer no banco.
- Falta apenas ajuste no frontend para exibir o menu ⋮ com "Excluir comentário" também para o autor da publicação.

## Mudanças

### `src/components/feed/CommentsSheet.tsx`
- Nova prop `publicationAuthorId?: string`.
- Trocar `isMine` por `canDelete = currentUserId === c.user_id || currentUserId === publicationAuthorId` — controla exibição do menu ⋮.

### `src/routes/_authenticated/feed.tsx`
- Passar `publicationAuthorId={commentsFor?.author_id}` para `<CommentsSheet>`.

Sem mudanças no backend nem no banco.
