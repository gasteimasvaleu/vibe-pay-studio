# Auto-reconciliar pagamento no poller

## Situação

- Webhook do Asaas continua não chegando (`asaas_events` vazio) mesmo após reativação.
- Modal fecha corretamente (poller consulta o Asaas direto), mas o banco não é atualizado → `publication_unlocks.status` fica `pending` e a publicação não desbloqueia.
- Precisamos fechar o ciclo direto do poller, sem depender do webhook.

## Mudanças

### 1. Extrair a lógica de reconciliação do webhook

Criar `src/lib/payments-reconcile.server.ts` com uma função pura server-only:

```ts
applyPaidIntent(supabaseAdmin, intent, asaasPaymentId): Promise<void>
```

Responsabilidades:
- Ler `intent.metadata` (`referenceTable`, `referenceId`, `buyerId`, `amountCents`).
- Se `wallet_topups`: chamar `creditWalletTopup` (com dedupe por `provider_ref`).
- Caso contrário: chamar `markStatus(table, refId, 'paid', providerRef)` — mesma lógica do webhook.
- Marcar `payment_intents.processed_at = now()` e `event_type = 'POLLER_RECONCILED'`.
- Idempotente: só age se `processed_at IS NULL`.

### 2. Refatorar o webhook para usar essa função

Em `src/routes/api/public/webhooks/asaas.ts`, no branch `targetStatus === 'paid'`, delegar para `applyPaidIntent`. Assim webhook e poller compartilham a mesma implementação e nunca divergem.

Manter no webhook a lógica específica de outros status (`refunded`, `cancelled`, `authorized`, `in_analysis`, `partially_refunded`) e dos fluxos de `transfer` e `subscription` — o poller só cuida do caminho "pagamento concluído".

### 3. Chamar do poller

Em `getPaymentIntentStatus` (`src/lib/payments.functions.ts`):

- Após buscar `payment` no Asaas, se `payment.status` ∈ (`RECEIVED`, `CONFIRMED`, `RECEIVED_IN_CASH`) **e** `intent.processed_at` for `null`:
  - `await import('@/lib/payments-reconcile.server')` e chamar `applyPaidIntent(supabaseAdmin, intent, intent.asaas_payment_id)`.
- Devolver o status como já faz. Erros de reconciliação são logados mas não quebram o poll.

## Efeito

- Publicação atual (`2c3ea175-…`) será desbloqueada no próximo poll — basta reabrir a página do feed.
- Vale para todos os fluxos que criam `payment_intents`: assinatura, tip, chat unlock, video call, publicação, recarga de wallet.
- Se o webhook voltar a funcionar depois, `processed_at` já estará preenchido e o webhook simplesmente vira no-op (idempotente).

## Fora de escopo

- Backfill manual da publicação já paga — se você quiser, faço um `UPDATE` direto agora além do fix; caso contrário, ela desbloqueia sozinha ao reabrir o feed depois do deploy.
- Diagnóstico do webhook no painel Asaas (é do lado deles).

## Arquivos tocados

- `src/lib/payments-reconcile.server.ts` (novo)
- `src/lib/payments.functions.ts` (poller)
- `src/routes/api/public/webhooks/asaas.ts` (refactor para usar a função compartilhada)

Sem migração de banco.
