## Objetivo

Carregar mais publicações gradualmente no feed e nas abas "Postagens" e "Mídias" do perfil, usando infinite scroll (rolagem infinita) com `IntersectionObserver` e `useInfiniteQuery`.

## Feed (`/feed`)

`getFeed` já retorna `nextCursor`. Migrar `src/routes/_authenticated/feed.tsx`:

- Trocar `useQuery` por `useInfiniteQuery`:
  - `queryKey: ["feed"]`
  - `queryFn: ({ pageParam }) => fetchFeed({ data: { limit: 20, cursor: pageParam } })`
  - `initialPageParam: undefined`
  - `getNextPageParam: (last) => last.nextCursor ?? undefined`
- Renderizar `data.pages.flatMap(p => p.items)`.
- Sentinela ao final da lista (`<div ref={sentinelRef} />`) com `IntersectionObserver` que chama `fetchNextPage()` quando visível e `hasNextPage && !isFetchingNextPage`.
- Mostrar loader pequeno enquanto `isFetchingNextPage`; "Fim do feed" quando não houver mais.
- Ajustar as chamadas que hoje fazem `setQueryData(["feed"], ...)` para atualizar todas as páginas (`{ pages: prev.pages.map(...), pageParams }`). Nas mutações destrutivas (delete/edit), continuar usando `invalidateQueries(["feed"])`.

## Perfil — abas "Postagens" e "Mídias"

Criar dois `createServerFn` em `src/lib/publications.functions.ts` (protegidos, mas aceitando `userId` do dono do perfil consultado):

1. `getUserPostsGrid({ userId, cursor?, limit=24 })` → `{ items: GridPostItem[]; nextCursor: string | null }`
   - `publications` do autor, `archived_at IS NULL`, `published_at <= now()`, `order by published_at desc`, `limit+1` para calcular cursor.
   - Junta primeira mídia (`position asc`) para `cover_url`/`cover_type` + `media_count` + flag `has_audio`.
   - `GridPostItem = { id, cover_url, cover_type: 'image'|'video'|null, media_count, has_audio, published_at }`.

2. `getUserMediasGrid({ userId, cursor?, limit=24 })` → `{ items: GridMediaItem[]; nextCursor: string | null }`
   - `publication_media` join `publications` do autor com filtros de publicação.
   - Cursor composto `published_at|position` (ordenar por `published_at desc, position asc`); serializado como string.
   - `GridMediaItem = { id, publication_id, url, type: 'image'|'video' }`.

Atualizar `src/routes/_authenticated/profile.$username.tsx`:

- Adicionar `useInfiniteQuery` para cada aba:
  - `["user-posts-grid", userId]` — sempre habilitado.
  - `["user-medias-grid", userId]` — `enabled: activeTab === "medias"`.
- Renderizar grade `grid-cols-3 gap-1` com células `aspect-square`:
  - Postagens: capa (img ou `<video preload="metadata">`), ícone `Layers` se `media_count > 1`, `Film` se vídeo, `AudioLines` se `has_audio` sem mídia visual.
  - Mídias: cada arquivo individual (img/video).
  - Clique → `navigate({ to: "/publicacao/$id", params: { id } })` (rota existente do feed/publicação).
- Skeleton grid 9 células enquanto `isLoading`.
- Empty state ("Nenhuma postagem ainda" / "Nenhuma mídia ainda").
- Sentinela ao final de cada grade com o mesmo padrão de `IntersectionObserver` para `fetchNextPage`.

## Utilitário compartilhado

Criar `src/hooks/useInfiniteScrollSentinel.ts` — hook que recebe `{ hasNextPage, isFetchingNextPage, fetchNextPage }` e retorna um `ref` para colocar num `<div>` sentinela. Usado no feed e nas duas grades.

## Escopo

- Sem mudanças de layout/visual além do loader e sentinela.
- Sem mudanças nas mutações de curtir/comentar/desbloquear.
- Migração do `feed.tsx` mantém todas as sheets/dialogs existentes.
