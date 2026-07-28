## Exibir avatar real do usuário nos comentários

**`src/lib/publications.functions.ts`**
1. Adicionar `author_avatar_url: string | null` ao tipo `PublicationComment`.
2. Em `listComments` — selecionar `avatar_url` junto de `username` na consulta a `profiles` e devolver no map final.
3. Em `addComment` — selecionar `avatar_url` no lookup do perfil e incluir no retorno.

**`src/components/feed/CommentsSheet.tsx`**
- Em `CommentRow` (linha 49), renderizar `<img src={c.author_avatar_url}>` quando presente; manter o fallback com a inicial em círculo quando não houver avatar. Trocar `rounded-md` por `rounded-full` para alinhar com padrão de avatares do app.
