## Objetivo

Ampliar `src/routes/api/public/webhooks/asaas.ts` para reconhecer os eventos da aba **Assinaturas** e refletir o ciclo de vida em `public.subscriptions`. As cobranças recorrentes de cada ciclo continuam chegando como `PAYMENT_*` (já tratado); aqui cuidamos só do estado da assinatura em si.

## Mapeamento evento → status

Enum `subscription_status` atual: `active | cancelled | expired | pending`. Suficiente, sem migration.

| Evento Asaas | Ação em `subscriptions` |
|---|---|
| `SUBSCRIPTION_CREATED` | Apenas registra e loga; a assinatura já foi criada pelo nosso fluxo interno. Não altera status. |
| `SUBSCRIPTION_UPDATED` | Apenas registra e loga (mudança de plano/valor no Asaas). Sem alteração de status. |
| `SUBSCRIPTION_INACTIVATED` | `status = 'expired'` (assinatura parou de renovar). |
| `SUBSCRIPTION_DELETED` | `status = 'cancelled'`. |
| `SUBSCRIPTION_SPLIT_DISABLED` | Só loga `console.warn` — split desligado no Asaas, afeta repasse ao criador. |
| `SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK` | Só loga `console.warn`. |
| `SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK_FINISHED` | Só loga `console.warn`. |

## Mudanças no handler

1. Ampliar `AsaasWebhookPayload` com `subscription?: { id: string; status?: string; externalReference?: string | null }`.
2. Novo helper `applySubscriptionStatus(supabaseAdmin, subscriptionRow, targetStatus, providerRef)`:
   - Update `status` e `provider_ref`.
   - Nunca sobrescreve `cancelled`/`expired` já finais quando o novo estado for outro final chegando fora de ordem — usa `.not("status","in","(cancelled)")` para expired e vice-versa.
3. Novo bloco no POST, executado quando `payload.subscription?.id` estiver presente:
   - Localiza pela ordem: `provider_ref = subscription.id` → depois `id = subscription.externalReference` (que gravamos como o `subscriptions.id` no nosso fluxo).
   - Se `SUBSCRIPTION_SPLIT_*`, apenas loga e marca `asaas_events.processed_at`.
   - Se `SUBSCRIPTION_INACTIVATED` ou `SUBSCRIPTION_DELETED`, chama o helper.
   - Se `SUBSCRIPTION_CREATED`/`UPDATED`, apenas loga.
   - Se nenhum registro encontrado → `console.warn` e segue (não retorna erro).
4. Ordem de decisão no POST fica:
   - `payload.payment` → fluxo de cobrança (existente).
   - `payload.transfer` → fluxo de transferências (existente).
   - `payload.subscription` → **novo** fluxo de assinaturas.
   - Nenhum → apenas registra evento.

## Fora de escopo

- Sincronizar mudança de valor/plano quando `SUBSCRIPTION_UPDATED` chega (não temos hoje colunas separadas de plano que dependam disso; a próxima cobrança já vem com o valor correto via `PAYMENT_*`).
- Reativar assinatura via webhook (só via novo fluxo de checkout do lado do app).
- UI de status — as telas já leem `subscriptions.status` cru.

## Arquivos afetados

- `src/routes/api/public/webhooks/asaas.ts` — novo bloco `SUBSCRIPTION_*` + helper `applySubscriptionStatus`.
