## Problema

Em `getUserPublications`, o filtro `archived_at IS NULL` só é aplicado quando o visitante NÃO é o dono do perfil. Isso faz com que o próprio dono continue vendo seus posts arquivados no perfil dele (como no screenshot).

## Correção

**`src/lib/publications.functions.ts`** — em `getUserPublications` (linhas 330–332): remover a condição `if (data.userId !== currentUserId)` e aplicar `query.is("archived_at", null)` incondicionalmente. Assim, posts arquivados desaparecem do feed e de qualquer perfil (inclusive o próprio), e só aparecem em `/postsarquivados` (que usa `getArchivedPublications`).

Nenhuma outra mudança necessária — `getFeed` e demais listagens já filtram `archived_at IS NULL`, e a invalidação de cache pelo `PublicationOptionsMenu` já cobre a saída imediata do post da tela.