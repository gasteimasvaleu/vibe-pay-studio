## Objetivo

Cada botão `>` dos carrosséis de `/em-alta` abre uma página dedicada da seção, com scroll infinito, usando exatamente os mesmos cards/elementos do carrossel.

## Como fica

- Rota nova: `/em-alta/{secao}` (ex.: `/em-alta/top-creators`, `/em-alta/ofertas`, `/em-alta/perfis-gratuitos`, `/em-alta/mais-mimadas`, `/em-alta/rumo-ao-topo`, `/em-alta/posts`, `/em-alta/chat`, `/em-alta/um-a-um`, `/em-alta/lives`).
- Cabeçalho enxuto igual ao atual (`DashboardShell` com botão voltar, sem card de perfil), título = nome da seção.
- Em vez de carrossel horizontal, os mesmos cards em grade que quebra linha (mesmos componentes de `Cards.tsx`, mesmos tamanhos), carregando mais itens conforme o usuário rola.
- Skeletons iguais aos da página principal enquanto carrega; estado vazio quando a seção não tem itens.

## Backend

Hoje o `em_alta_feed()` devolve todas as seções juntas com `LIMIT 12` fixo — não dá para paginar. Será criada uma função nova `em_alta_section(_section text, _limit int, _offset int)` que reaproveita exatamente a mesma lógica de ranking/filtros de cada seção (mesmos períodos de 7/30/90 dias, mesmas junções), aplicando `LIMIT/OFFSET` e ordenação estável. O `em_alta_feed()` atual permanece intacto para a página principal.

## Frontend

1. `src/lib/em-alta.functions.ts`: nova server function `getEmAltaSection({ section, offset, limit })` protegida pelo mesmo middleware de auth.
2. `src/lib/em-alta.types.ts`: mapa de seções (slug → título, tipo de card) usado tanto pela página principal quanto pelas páginas dedicadas.
3. Estrutura de rotas: `em-alta.tsx` vira layout com `<Outlet />`; a página atual passa para `em-alta.index.tsx`; nova `em-alta.$section.tsx` renderiza a lista paginada com `useInfiniteQuery` + o hook já existente `useInfiniteScrollSentinel`.
4. `EmAltaSection.tsx`: o botão `>` vira `<Link to="/em-alta/$section">` (mantendo o mesmo visual e o `aria-label`).

## Detalhes técnicos

- Paginação por offset (páginas de 24 itens); `hasNextPage` = a última página veio cheia.
- Ordenações recebem desempate por `id` para evitar itens repetidos entre páginas.
- Cards mantêm as classes atuais (inclusive `snap-start shrink-0`), apenas o contêiner muda de carrossel para `flex flex-wrap` — nenhum ajuste de layout interno dos cards.
- `head()` próprio por rota (título da seção, `noindex`, como já é feito em `/em-alta`).
