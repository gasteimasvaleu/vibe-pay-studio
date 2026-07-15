## Página /postsarquivados (somente dono)

Nova página autenticada que lista apenas os posts do próprio usuário que foram arquivados via popover. Arquivar/desarquivar continua restrito ao dono (a opção só aparece em `ownerOptions` e o filtro server-side usa `author_id = context.userId`).

### 1. Server function

Em `src/lib/publications.functions.ts`, adicionar `getArchivedPublications({ cursor?, limit=10 })`:
- Middleware `requireSupabaseAuth`.
- Filtro: `author_id = context.userId` e `archived_at IS NOT NULL`.
- Ordenação: `archived_at DESC` (cursor por `archived_at`).
- Mesma pipeline de enriquecimento de `getFeed` (mídia, likes, bookmarks, contagens, is_owner=true), retornando `FeedItem[]` + `archived_at`.
- Retorno: `{ items: (FeedItem & { archived_at: string })[]; nextCursor: string | null }`.

Nenhuma mutação nova. Reutiliza `setPublicationArchived` para desarquivar (já filtra por `author_id`, então só o dono consegue).

### 2. Rota

Criar `src/routes/_authenticated/postsarquivados.tsx`:
- `createFileRoute("/_authenticated/postsarquivados")` com `head()` "Posts arquivados".
- Header simples: voltar + título.
- `useInfiniteQuery({ queryKey: ["archived-posts"] })` chamando a nova server fn.
- Renderiza `<PublicationCard item={...} queryKey={["archived-posts"]} />`.
- `useInfiniteScrollSentinel` para paginação.
- Skeletons no primeiro load e estado vazio "Nenhum post arquivado".

### 3. Popover — opção "Desarquivar" (apenas dono)

Em `src/components/feed/PublicationOptionsMenu.tsx`:
- Expor `archived_at` no `FeedItem` (default `null`) e mapear nas server fns que já retornam `FeedItem` (getFeed, getUserFeed, getUserPostsGrid, getArchivedPublications).
- Em `ownerOptions`: se `item.archived_at` estiver setado, mostrar "Desarquivar post" chamando `setPublicationArchived({ id, archived: false })`; caso contrário manter "Arquivar post".
- `archiveMutation.onSuccess`: invalidar também `["archived-posts"]`.
- Como `ownerOptions` só é usado quando `item.is_owner`, viewers nunca veem arquivar/desarquivar — garante que só o dono pode arquivar/desarquivar.

### Fora de escopo
- Link para /postsarquivados em nav/menu (acessível por URL).
- Bulk actions, busca ou filtros dentro dos arquivados.
- Mudanças no feed/perfil além da adição do campo `archived_at` no tipo.