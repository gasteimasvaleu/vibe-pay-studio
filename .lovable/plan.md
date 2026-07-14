## Ações do popover do criador (post próprio)

Hoje o `PublicationOptionsMenu` já mostra as 6 opções para o dono, mas 4 delas caem no toast "Em breve". Vou implementá-las de verdade.

### 1. Migração (schema)
Adicionar coluna de arquivamento em `publications`:
- `archived_at TIMESTAMPTZ NULL`
- Atualizar policy `publications_public_read` para exigir `archived_at IS NULL` (dono continua vendo pela policy `publications_author_read`).
- Índice parcial `WHERE archived_at IS NULL` para o feed.

### 2. Novos server functions em `src/lib/publications.functions.ts`
Todos com `requireSupabaseAuth` e checagem `author_id = userId`:

- `updatePublicationCaption({ id, caption })` — `update publications set caption`.
- `setPublicationCommentsDisabled({ id, disabled })` — toggle `comments_disabled`.
- `setPublicationArchived({ id, archived })` — set `archived_at = now()/null`.
- `deletePublication({ id })`:
  1. carrega `publication_media` (storage_path) e `audio_storage_path` do post.
  2. `supabaseAdmin.storage.from('publications').remove([...paths])` (import dinâmico dentro do handler).
  3. `delete from publications where id and author_id = userId` (cascade cuida de likes/comments/bookmarks/unlocks).

### 3. Filtrar arquivados nos feeds
Em `getFeed` e `getUserPublications` adicionar `.is('archived_at', null)` (o próprio dono vê os arquivados em uma view separada — fora do escopo desta task; hoje ele só verá que sumiu do feed público, que é o comportamento pedido "estilo Instagram simplificado").

### 4. UI — `PublicationOptionsMenu.tsx`
Substituir os `soon` por mutations (`useMutation` + `queryClient.invalidateQueries(['feed'])` + `showTopBanner`):

- **Editar legenda**: abre novo `EditCaptionDialog` (Dialog do shadcn com Textarea pré-preenchida com `item.caption`, botão Salvar chama `updatePublicationCaption`).
- **Desabilitar/Habilitar comentários**: chama `setPublicationCommentsDisabled` com o inverso do estado atual; feedback via banner.
- **Arquivar post**: chama `setPublicationArchived({archived:true})`; banner "Post arquivado".
- **Excluir post**: abre `AlertDialog` de confirmação ("Esta ação não pode ser desfeita"); on-confirm chama `deletePublication`.

O menu recebe callbacks via props (`onEditCaption`, `onDelete`, etc.) ou lida internamente — vou manter internamente para não inflar o `PublicationCard`, exceto o dialog de edição que precisa de estado próprio.

### 5. Tipo `FeedItem`
Já contém `caption`, `comments_disabled`, `is_owner`. Não precisa alterar. `archived_at` não precisa ser exposto ao cliente.

### Arquivos tocados
- migração SQL (nova)
- `src/lib/publications.functions.ts`
- `src/components/feed/PublicationOptionsMenu.tsx`
- `src/components/feed/EditCaptionDialog.tsx` (novo)
- `src/components/feed/PublicationCard.tsx` (só para invalidar cache após ações, se necessário)
