## Publicações Agendadas — nova página `/publicacoes-agendadas`

### 1. Server functions (`src/lib/publications.functions.ts`)

- `getScheduledPublications({ limit, cursor })` — lista posts do autor com `scheduled_at > now()`, ordenados por `scheduled_at asc`. Retorna `{ items, nextCursor }`.
- `reschedulePublication({ id, scheduledAt })` — atualiza `scheduled_at` (valida futuro).
- `publishScheduledNow({ id })` — seta `scheduled_at = null` e `published_at = now()`.
- `cancelScheduledPublication({ id })` — deleta o post agendado (ou marca como rascunho — vou usar delete para simplificar, já que o post ainda não foi visto).

Todas com `.middleware([requireSupabaseAuth])` e checando `author_id = userId`.

### 2. Nova rota `src/routes/_authenticated/publicacoes-agendadas.tsx`

Espelha `postsarquivados.tsx`:
- Header com botão voltar + título "Publicações agendadas".
- Lista infinita usando `useInfiniteQuery`.
- Cada item mostra: mídia (thumb), texto, `scheduled_at` formatado, badge de preço se pago.
- Menu (⋯) por item com ações: **Publicar agora**, **Reagendar** (abre dialog com `<input type="datetime-local">`), **Cancelar agendamento** (confirm).
- Empty state: "Você não tem publicações agendadas."

### 3. Card no dashboard

Adicionar em `src/components/dashboard/CreatorDashboard.tsx`, no grupo "Área do Criador", logo abaixo de "Acervo":

```
ActionCard
  icon: Clock
  title: "Agendados"
  description: "Veja e edite suas publicações agendadas"
  to: "/publicacoes-agendadas"
```

### 4. Sem mudanças de schema

Todos os campos já existem (`publications.scheduled_at`, `published_at`, `author_id`, `pinned`, `pricing_mode`, etc). Filtro no feed já respeita `published_at <= now()`.