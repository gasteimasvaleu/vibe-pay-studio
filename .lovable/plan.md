## Objetivo

Na página `/profile/$username`:
- **Aba Postagens**: substituir o grid 3×3 por cards completos (mesmo componente do feed), com infinite scroll.
- **Aba Mídias**: manter grid, mas 3 colunas no mobile e 4 colunas no desktop, adicionando barra de filtros **Todos / Fotos / Vídeos / Pagos**.

## Aba Postagens — cards inteiros

1. Em `src/lib/publications.functions.ts`, adicionar `getUserFeed({ userId, cursor?, limit=10 })` — mesma forma de retorno de `getFeed` (`{ items: FeedItem[]; nextCursor: string|null }`), reutilizando o pipeline atual de `getFeed` mas filtrando `author_id = userId` (sem restrição de "seguindo/próprios"). Inclui contagens, mídias, unlock state, etc.
2. Em `profile.$username.tsx`, remover `getUserPostsGrid` do fluxo da aba Postagens. Trocar `useInfiniteQuery` de posts para `getUserFeed` com `queryKey: ["user-feed", userId]`.
3. Renderizar cada item com `<PublicationCard item={...} queryKey={["user-feed", userId]} />` — mesmo componente usado em `/feed`. Ele já cuida de curtir, comentar, desbloquear e atualização de cache via `patchItem` (que já suporta `InfiniteData`).
4. Manter sentinel + loader com `useInfiniteScrollSentinel`. Empty state "Nenhuma postagem ainda." Skeleton simples (2 cards placeholder).
5. `getUserPostsGrid` continua existindo mas deixa de ser usado aqui; pode ser removido se não houver outro consumidor (checar antes de deletar).

## Aba Mídias — grid + filtros

1. Adicionar barra de filtros acima do grid, no mesmo card branco arredondado do screenshot:
   - Estado local `mediaFilter: "all" | "photos" | "videos" | "paid"`.
   - Botões pill: **Todos** (destacado com fundo `bg-primary/15 text-primary`), **Fotos**, **Vídeos**, **Pagos** (inativos: `text-muted-foreground`). Layout `flex justify-center gap-6 py-3`.
2. Atualizar `getUserMediasGrid` em `src/lib/publications.functions.ts`:
   - Aceitar `filter: "all" | "photos" | "videos" | "paid"` no `inputValidator`.
   - `photos` → `type = 'image'`; `videos` → `type = 'video'`; `paid` → join a publicações com `visibility = 'paid'` e `price_cents > 0` (retornar também campo `is_paid` para overlay opcional).
   - Cursor continua sendo `published_at|position`; paginação por filtro (cada filtro tem sua própria query).
3. Em `profile.$username.tsx`:
   - Trocar `queryKey` para `["user-medias-grid", userId, mediaFilter]`.
   - Passar `filter` no `queryFn`. `enabled` continua condicionado a `activeTab === "medias"`.
   - Grid: `grid-cols-3 md:grid-cols-4 gap-1`.
   - Manter clique navegando para publicação (rota atual permanece — sem mudanças em navegação).
   - Ao clicar num filtro, o `useInfiniteQuery` refaz fetch da primeira página automaticamente (chave nova).
4. Empty states por filtro ("Nenhuma foto ainda.", "Nenhum vídeo ainda.", "Nenhuma mídia paga ainda.").

## Detalhes técnicos

- `getUserFeed` reaproveita helpers internos de `getFeed` (montagem de `FeedItem`); se hoje a lógica está inline em `getFeed`, extrair para função privada `buildFeedItems(rows, viewerId)` no mesmo arquivo e chamar dos dois server fns.
- Sem novas tabelas nem migrações. Sem mudanças nas mutações (curtir/comentar/desbloquear).
- Sem alterações no `/feed`, no `PublicationCard`, no `useInfiniteScrollSentinel`, nem em outras rotas.
- Type-safe: exportar tipos novos (`GridMediaFilter`) de `publications.functions.ts`.

## Escopo fora

- Filtro "Pagos" na aba Postagens (não pedido).
- Contadores por filtro na barra (não pedido).
- Alteração do layout visual da barra de tabs Postagens/Mídias.
