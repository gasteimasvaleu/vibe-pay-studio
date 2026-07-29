## Escopo

Adicionar cobertura completa dos produtos que hoje faltam em `/my-monetisex-stats`:

1. **Filtros Top assinantes**: incluir Postagem, Story, Videochamada, Live.
2. **Extratos › Ganhos por produto**: label/cor de Story (já feito na resposta anterior).
3. **Nova aba "Stories" em Engajamento** com Top Story.
4. **Resumo (Visão geral)**: breakdown por produto substituindo os 4 itens fixos de assinatura.

## Alterações

### Backend — `src/lib/stats.functions.ts`

**a) `getTopAssinantes` — expandir metric union**
```ts
metric?: "total" | "subscription" | "tip" | "chat_unlock"
       | "publication_unlock" | "story_unlock" | "video_call" | "live_ticket"
```
Substituir o if/else por filtro genérico contra `Set` de kinds válidos.

**b) Novo `getEngajamentoStories`** (modelado como `getEngajamentoPublicacoes`, mas sem likes/comments — a tabela `stories` não tem essas métricas):
```ts
inputValidator: { from, to, sort?: "recent" | "revenue" | "views" | "unlocks" }
```
Handler:
- `select id, caption, media_type, media_path, thumb_path, price_cents, published_at, expires_at from stories where creator_profile_id = active and published_at between from/to`
- Agregar `story_unlocks` (soma amount_cents, contagem) e `story_views` (contagem) por `story_id` no período.
- Retornar `items[]` com `{ id, caption, mediaType, thumbPath, priceCents, publishedAt, revenue, unlocks, views }` + `totalCount, totalRevenue, totalViews, totalUnlocks`.
- Sorters: recent (publishedAt desc), revenue, views, unlocks.

**c) `getResumoStats` — adicionar breakdown por produto**
Já lê `transactions` no período (via `historyRes`). Adicionar no retorno:
```ts
byProduct: {
  subscription: { grossCents, count },
  publication_unlock: { grossCents, count },
  story_unlock: { grossCents, count },
  chat_unlock: { grossCents, count },
  video_call: { grossCents, count },
  live_ticket: { grossCents, count },
  tip: { grossCents, count },
  challenge_contribution: { grossCents, count },
}
```
Manter os campos antigos (`subscriptionsCount`, `subscriptionsRevenueCents`, `renewalsCount`, `profileViews`) para não quebrar consumidores existentes.

### Frontend — `src/routes/_authenticated/my-monetisex-stats.tsx`

**a) `TOP_ASSINANTES_CHIPS` / `TOP_METRIC_MAP`** (~L1568–1572): expandir para 8 chips (Total, Assinaturas, Postagem, Story, Chat, Videochamada, Live, Mimos). `CardTabsRow` já colapsa em dropdown no mobile.

**b) `ENGAJAMENTO_TABS`** (~L1189): adicionar `"Stories"`. Novo bloco espelhando `Publicações`:
- Const `ORDENAR_STORIES = ["Recentes", "Faturamento", "Visualizações", "Desbloqueios"]`.
- Mapear para sort `"recent" | "revenue" | "views" | "unlocks"`.
- Query `getEngajamentoStories`, gated por `tab === "Stories"`.
- Renderizar `EngajamentoChart` (mesmo componente, `metric` = campo escolhido).
- Card lateral "Resumo": Quantidade, Visualizações, Desbloqueios, Faturamento (ícones `Sparkles`, `Eye`, `Unlock`, `DollarSign`).
- Card lateral "Top story": mostra thumb (`thumb_path` via storage `stories`), caption, receita, views, unlocks. Link para `/story/[id]` só quando aplicável — o app não tem página dedicada de story, então o card fica apenas visual (sem CTA de "Abrir"), consistente com como um top-story faz sentido.

**c) Card Resumo (Visão geral)** (~L1529–1539): substituir os 4 `ResumoItem` fixos por lista dinâmica renderizando cada entrada de `data.byProduct` na ordem: Assinatura, Postagem, Story, Chat, Videochamada, Live, Mimo, Desafio. Ocultar linhas com `count === 0` para não poluir. Cada linha usa `KIND_LABEL[kind]` + bolinha `KIND_COLOR[kind]` + `formatBRL(grossCents)` à direita e `count` como subtítulo. Manter `Visitantes` (não é produto) como primeira linha destacada.

## Fora de escopo

- Likes/comentários em stories (schema não tem).
- Página pública de story individual (top-story fica só visual).
