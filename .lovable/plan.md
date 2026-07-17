
## 1. Chart do card "Assinaturas" (visual + dados reais)

Substituir o `BarChart` atual (novos/renovações) por um `ComposedChart` com dois eixos, no mesmo estilo do screenshot:

- **Título dinâmico**: `"{totalAssinantes} Assinantes, {R$ faturamento}"` (usa `stats.data.novosPeriodo + renovacoesPeriodo` e `faturamentoPeriodo`).
- **Linha "Faturamento"** — cor **roxo** (`#8B5CF6`), eixo Y esquerdo em `R$`.
- **Linha "Quantidade"** — cor **cinza** (`hsl(var(--muted-foreground))`), eixo Y direito (inteiro).
- Grid tracejado, legenda no topo direito com bullets coloridos, tooltip formatado (BRL para faturamento).
- Vazio: overlay `"Nenhum dado disponível para o período."` centralizado sobre o grid (não substitui o chart).
- Datas do eixo X: `MMM d, yyyy` em duas linhas (igual screenshot).

Dados já vêm de `getAssinantesStats().daily` (`gross`, `novos + renovacoes` = quantidade). Nenhuma mudança de backend necessária para o chart.

## 2. Nova aba "Atividade dos assinantes"

Adicionar `"Atividade dos assinantes"` ao array `ASSINANTES_TABS`. Ao selecionar, renderiza um feed cronológico real das ações dos assinantes no período.

### Backend — novo `getAtividadeAssinantes` em `src/lib/stats.functions.ts`

- Input: `{ from, to }`.
- Lê em paralelo, filtrado por `creator_id = userId` e período:
  - `subscriptions` (`id, subscriber_id, status, price_cents_paid, started_at, created_at, canceled_at, current_period_end`)
  - `transactions` de assinantes (`kind in ('subscription','tip','chat_unlock','publication_unlock')`, `buyer_id, amount_cents_gross, kind, created_at`)
- Deriva eventos:
  - `nova_assinatura` (primeira subscription do subscriber no criador)
  - `renovacao` (subscription subsequente do mesmo subscriber)
  - `cancelamento` (`canceled_at` no período)
  - `compra` (transaction do tipo tip/chat_unlock/publication_unlock)
- Enriquecer com `profiles (username, display_name, avatar_url)` via `.in('user_id', [...ids])`.
- Retorna `Array<{ at: string; type: 'nova_assinatura'|'renovacao'|'cancelamento'|'compra'; kind?: string; amountCents: number; user: { id, username, displayName, avatarUrl } }>` ordenado desc, limitado a 100.

### UI — nova `AtividadeAssinantesInline`

Lista com linhas:
- Avatar + `@username` / display name
- Ícone + label do evento (`UserPlus` Nova assinatura, `RefreshCw` Renovação, `X` Cancelamento, `Gift`/`MessageSquare`/`Lock` Compra)
- Valor em BRL (quando aplicável)
- Timestamp relativo (`há X min/h/d`)

Vazio: `"Nenhuma atividade no período."` Loading: skeletons.

## 3. Arquivos alterados

- `src/lib/stats.functions.ts` — adicionar `getAtividadeAssinantes`.
- `src/routes/_authenticated/my-monetisex-stats.tsx`:
  - Importar `ComposedChart`, `Line` de `recharts` e novos ícones.
  - Trocar o chart do card Assinaturas.
  - Adicionar 3ª aba e renderizar `AtividadeAssinantesInline`.

Sem migração de banco.
