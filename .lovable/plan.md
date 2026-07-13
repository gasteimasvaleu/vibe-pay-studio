## Objetivo

Ampliar o webhook `src/routes/api/public/webhooks/asaas.ts` para tratar corretamente os novos eventos da aba Cobrança que você marcou (autorização de cartão, análise de risco, estorno parcial e eventos de split), mantendo idempotência e o modelo 85/15.

## Mudanças no handler

### 1. Novos conjuntos de eventos

Adicionar, ao lado dos conjuntos existentes:

- `TERMINAL_AUTHORIZED` = `{ PAYMENT_AUTHORIZED }` → status intermediário `authorized` (cartão pré-autorizado, ainda não capturado). Não credita wallet do criador.
- `RISK_PENDING` = `{ PAYMENT_AWAITING_RISK_ANALYSIS }` → status `in_analysis`.
- `RISK_APPROVED` = `{ PAYMENT_APPROVED_BY_RISK_ANALYSIS }` → trata como `paid` (mesmo caminho de `PAYMENT_RECEIVED`).
- `RISK_REPROVED` = `{ PAYMENT_REPROVED_BY_RISK_ANALYSIS }` → trata como `cancelled`.
- `TERMINAL_PARTIAL_REFUND` = `{ PAYMENT_PARTIALLY_REFUNDED }` → novo status `partially_refunded`.
- `SPLIT_EVENTS` = `{ PAYMENT_SPLIT_CANCELLED, PAYMENT_SPLIT_DIVERGENCE_BLOCK, PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED }` → registrados em `asaas_events` mas **não** alteram status da referência; apenas logam + marcam `processed_at`, para auditoria (afetam a carteira do criador direto no Asaas).

### 2. Ampliar `markStatus`

Aceitar os novos valores no union type: `"paid" | "refunded" | "cancelled" | "authorized" | "in_analysis" | "partially_refunded"`.

Ajustes finos:
- Para `subscriptions`, apenas `paid` continua virando `active`; os demais status intermediários (`authorized`, `in_analysis`) não sobrescrevem uma assinatura já ativa (guardar via `.neq('status','active')` no update).
- Para `video_calls` continua usando `payment_status`.

### 3. Ordem de decisão no POST

Substituir o if/else atual por:

```
if (PAID.has(t) || RISK_APPROVED.has(t))       target = 'paid'
else if (PARTIAL_REFUND.has(t))                target = 'partially_refunded'
else if (REFUNDED.has(t))                      target = 'refunded'
else if (CANCELLED.has(t) || RISK_REPROVED)    target = 'cancelled'
else if (AUTHORIZED.has(t))                    target = 'authorized'
else if (RISK_PENDING.has(t))                  target = 'in_analysis'
else if (SPLIT_EVENTS.has(t))                  target = null  // só audita
```

Wallet topup só credita quando `target === 'paid'` (comportamento atual, sem mudança).

### 4. Persistência de metadados de split

Nos eventos `PAYMENT_SPLIT_*`, além de gravar em `asaas_events`, incluir um `console.warn` estruturado com `paymentId` + `event_type` para facilitar rastreio, já que representam problemas potenciais no repasse ao criador.

## Fora de escopo

- Novos valores enum no banco: os status novos (`authorized`, `in_analysis`, `partially_refunded`) hoje só existem no update do webhook; se alguma coluna tiver enum estrito no Postgres, teremos que evoluir schema. Vou **verificar via `supabase--read_query`** antes de implementar; se houver enum, incluo migração adicionando os valores. Se as colunas forem `text`, não precisa migration.
- Eventos de assinatura (`SUBSCRIPTION_*`) e transferência (`TRANSFER_*`): ficam para o próximo turno quando você mandar os checks da aba Assinaturas.
- UI: nenhuma tela nova; só o webhook. Status intermediários já aparecem em telas que leem `status` cru.

## Arquivos afetados

- `src/routes/api/public/webhooks/asaas.ts` — nova lógica de eventos.
- (condicional) `supabase/migrations/*.sql` via `supabase--migration` se algum enum precisar de novos valores.
