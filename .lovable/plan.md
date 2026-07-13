## Objetivo

Dar funcionalidade real aos botões **curtir**, **comentar** e **favoritar** do `PublicationCard`, com persistência no banco e UI conforme os screenshots (toast "Post favoritado", contador "1 curtida", modal de comentários "Ainda não há nenhum comentário / Inicie a conversa").

## Backend (migration Supabase)

Criar 3 tabelas com RLS + GRANTs:

1. **`publication_likes`** — `publication_id`, `user_id`, `created_at`. PK composta `(publication_id, user_id)`.
   - RLS: SELECT público (autenticados), INSERT/DELETE apenas próprio `user_id = auth.uid()`.
2. **`publication_bookmarks`** — mesma estrutura, mesma política.
3. **`publication_comments`** — `id`, `publication_id`, `user_id`, `body text`, `created_at`.
   - RLS: SELECT autenticados (respeitando `comments_disabled`? — mantido simples: qualquer autenticado lê); INSERT próprio user; DELETE apenas dono do comentário ou dono da publicação.

Índices em `publication_id` para agregações.

## Server functions (`src/lib/publications.functions.ts`)

- `toggleLike({ publicationId })` → insere/remove, retorna `{ liked, likeCount }`.
- `toggleBookmark({ publicationId })` → idem, retorna `{ saved }`.
- `listComments({ publicationId })` → retorna array com `id, body, created_at, author_username`.
- `addComment({ publicationId, body })` → insere e retorna o novo comentário.

Estender `getFeed` para retornar em cada `FeedItem`:
- `like_count: number`
- `comment_count: number`
- `liked_by_me: boolean`
- `saved_by_me: boolean`

Implementação: após buscar `page`, consultar `publication_likes` e `publication_bookmarks` filtrando por `publication_id in (ids)`, agregar contagens e marcar as do `currentUserId`.

## Frontend

### `PublicationCard.tsx`
- Trocar `useState(liked/saved)` por props iniciais vindas do `FeedItem` (`liked_by_me`, `saved_by_me`, `like_count`, `comment_count`).
- Usar `useMutation` (TanStack Query) para `toggleLike` / `toggleBookmark` com **optimistic update** no cache do `["feed"]`.
- Ao favoritar com sucesso: `toast.success("Post favoritado")` / ao remover: `toast("Removido dos favoritos")` (usando sonner já disponível).
- Botão de comentar abre um modal (Dialog do shadcn) para a publicação selecionada.
- Abaixo da barra de ações mostrar contador: `{like_count} curtida{s !== 1 ? "s" : ""}` como no screenshot.

### Novo `CommentsSheet.tsx`
- Modal/Sheet ancorado no rodapé (mobile-style), fundo claro, título **"Comentários"** com botão X.
- Estado vazio: ícone/texto centralizado **"Ainda não há nenhum comentário"** + subtítulo **"Inicie a conversa."**
- Lista de comentários (avatar circular roxo com inicial, `@username`, corpo, tempo relativo).
- Rodapé fixo com avatar do usuário + input arredondado "Adicione um comentário..." + botão enviar circular.
- Usa `listComments` (via `useQuery`) e `addComment` (via `useMutation` com invalidate).

### `feed.tsx`
- Gerenciar estado `commentsFor: FeedItem | null` e passar `onComment` ao `PublicationCard`.
- Renderizar `<CommentsSheet publication={commentsFor} onOpenChange=... />`.

## Detalhes técnicos

- Todas as mutações usam `useServerFn` + `useMutation` e chamam `queryClient.setQueryData(["feed"], ...)` para atualização otimista de `liked_by_me`/`like_count`/`saved_by_me`.
- Servidor: para checar se já curtiu, tentar `INSERT` — se falhar por unique constraint, fazer `DELETE`. Alternativa mais simples: `SELECT` prévio e agir.
- Todos os endpoints exigem auth (`requireSupabaseAuth`).
- Formatação: `1 curtida`, `2 curtidas`, ocultar linha quando `like_count === 0`.

## Arquivos alterados/criados

- **migration** (nova) — 3 tabelas + RLS + grants + índices.
- `src/lib/publications.functions.ts` — 4 novas server fns + campos extras em `FeedItem`/`getFeed`.
- `src/components/feed/PublicationCard.tsx` — usar dados reais, mutações, toast, contador, callback de comentar.
- `src/components/feed/CommentsSheet.tsx` — **novo**.
- `src/routes/_authenticated/feed.tsx` — abrir CommentsSheet.

Fluxo de aprovação: primeiro a migration (aguarda seu OK), depois o código.