## Regra de negócio confirmada

Assinatura paga = seguir. Não haverá tabela `follows` separada nem botão "Seguir" gratuito. O feed passa a mostrar apenas publicações de creators que o viewer assina (ativos), além das do próprio viewer.

## Mudanças

### 1. `src/lib/publications.functions.ts` — `getFeed`
- Antes de buscar `publications`, carregar os `creator_id` de `subscriptions` onde `subscriber_id = viewer`, `status = 'active'` e `current_period_end > now()`.
- Montar `allowedAuthors = [viewer, ...creatorIds]`.
- Aplicar `.in('author_id', allowedAuthors)` na query de publicações.
- Se `allowedAuthors` só tiver o próprio viewer e ele não tiver posts, o feed volta vazio (comportamento esperado).
- Manter a ordenação atual (`pinned`, `published_at`) e paginação.

### 2. `src/routes/_authenticated/feed.tsx` — estado vazio
- Quando `items.length === 0`, mostrar mensagem clara:
  - Título: "Seu feed está vazio"
  - Texto: "Assine creators para ver publicações deles aqui."
  - Botão "Explorar creators" → navega para `/em-alta` (ponto de descoberta atual).
- Não mexer no restante do layout.

### 3. `/follow` (`src/routes/_authenticated/follow.tsx`)
- Fora de escopo desta iteração. Como "seguir" = "assinar", esta página vira redundante com `/subscriptions`. Posso remover/redirecionar em uma próxima etapa se você quiser — só me diga.

## Fora de escopo
- Nenhuma alteração no schema (sem tabela `follows`).
- Nenhuma mudança em `TipDialog`, `PublicationCard` ou perfil.
- Sem criar botão "Seguir" separado.
