
Página gigante, então vou fazer em 2 fases. Fase 1 troca todo o conteúdo fake dos cards que já têm dados no banco. Fase 2 cria as tabelas de coleta que faltam e liga os cards que dependem delas.

## Base comum

**Server functions novos em `src/lib/stats.functions.ts`** (todos com `requireSupabaseAuth`, escopo `creator_id = userId`):

1. `getEarningsSeries({ from, to })` → série diária `{ day, gross, net }` de `transactions status=paid` (exclui `withdrawal|refund|wallet_topup|wallet_bonus`).
2. `getEarningsByProduct({ from, to })` → agregação por `kind` com `gross`, `net`, `count`.
3. `getPeriodTotals({ from, to })` → gross/net do período + comparação vs período anterior.
4. `getResumoStats({ from, to })` → vendas totais, ticket médio, novos assinantes, renovações, projeção linear (net atual / dias decorridos × 30).
5. `getBancoSummary()` → wraps `getCreatorEarningsSummary` + próximo release (min `released_at` onde `wallet_released_at IS NULL`).
6. `listExtrato({ from, to, kinds, statuses, limit, offset })` → linhas de `transactions` + join com `profiles` do comprador (username/avatar).
7. `getAssinantesStats({ from, to })` → ativos, novos, renovações, cancelados, ticket médio da assinatura, top assinantes por gasto (soma de `transactions.amount_cents_gross` do buyer).
8. `getTopAssinantes({ from, to, metric })` → ranking por total | assinatura | mimos | chat.
9. `getRecordePeriodo({ from, to })` → top 3 dias de faturamento no período.

**Estado de período (URL search params)** via `validateSearch` no Route:
- `from`, `to` (ISO date), default = últimos 30 dias.
- `RangeSelector` vira funcional com presets ("Hoje", "7 dias", "30 dias", "Este mês", "Mês passado", "Custom") + Popover com `Calendar` shadcn range mode.
- Todos os panels leem `Route.useSearch()` e usam nas queries.

**TanStack Query** em cada painel com `queryKey: ["stats", <fn>, from, to, ...]`, `staleTime: 30_000`.

## Fase 1 — cards com dados prontos

- `EarningsChartCard`: linha simples (recharts) usando `getEarningsSeries`. Eixo Y = R$, header mostra total do período.
- `ProductTable`: `getEarningsByProduct` — remapeia `kind` para rótulos PT (Assinatura, Mimo, Post, Chat, Vídeo-chamada). Total no rodapé.
- `TopBadgeCard` (aside): faturamento de hoje + saldo liberado + a liberar (via `getBancoSummary`). Remove o texto fixo "top +100" e mostra badge só quando existir dado real (por ora esconde).
- `PeriodTotalCard`: valor de `getPeriodTotals`.
- `ResumoPanel`: `VendasCard`, `MeuBancoCard`, `AssinantesCard`, `ProjecaoFaturamentoCard` conectados a `getResumoStats` + `getBancoSummary`. `RecordeCard` usa `getRecordePeriodo`.
- `ExtratosPanel`:
  - `ExtratoChartCard`, `ExtratoFaturamentoCard`, `Top5PaisesCard` (usa `is_international` como proxy até termos país) → `getEarningsSeries` / `getEarningsByProduct`.
  - `ExtratoTable`: `listExtrato` com filtros `Todos/Concluídos/A receber/Estornos` (mapeia para `status` e `wallet_released_at`) e filtro de tipo de produto (`kind`).
  - `GanhosPorProdutoChartCard` / `GanhosPorProdutoTable`: `getEarningsByProduct` com % e legenda.
- `AssinantesPanel`:
  - Aba "Assinaturas": `getAssinantesStats` (contadores) + gráfico de novos/renovações por dia.
  - Aba "Top assinantes": `getTopAssinantes`.
  - Aba "Atividade" fica com placeholder (depende de Fase 2).
- `TopPostagemCard` (Destaques): usa `publications` do autor com contagem de likes/comments/unlocks para ordenar. `TopLiveCard` fica placeholder (Fase 2).

## Fase 2 — coleta que hoje não existe

Migração cria:

1. `public.publication_views (id, publication_id, viewer_id nullable, created_at)` + GRANT + RLS (insert público autenticado, select só do autor).
2. `public.profile_views (profile_id, viewer_id, created_at)` idem.
3. `public.live_sessions (id, creator_id, started_at, ended_at, viewers_peak, gross_cents, tips_cents)` + GRANT + RLS (autor gerencia, público lê ao vivo).
4. `public.creator_streak_days (creator_id, day date, activity_count)` — populado por trigger em `publications` insert.
5. Coluna `country_code` em `transactions` (nullable) para `Top5PaisesCard` real.

Hooks de escrita:
- `logPublicationView` server fn chamado quando `/post/:id` monta.
- `logProfileView` chamado no perfil público (throttle 30 min por viewer).
- Trigger em `publications` (insert) que faz upsert em `creator_streak_days`.

Isso libera:
- `AlcancePanel` (views/impressões/seguidores novos).
- `SequenciaPanel` (streak + calendário real).
- `TopLiveCard`, `EngajamentoPanel > Lives`.
- `Top5PaisesCard` real.

## Fora de escopo desta plano

- Analytics agregado por semana/mês (mantém granularidade diária).
- Comparativo YoY.
- Export CSV.

## Verificação

- `bun run build:dev` após cada fase.
- Sanity check: criar 2 transactions de kinds diferentes e confirmar que aparecem em Faturamento + Extrato + Resumo.
- Confirmar que trocar o range no `RangeSelector` refetcha todos os cards.
