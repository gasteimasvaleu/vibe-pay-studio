## Objetivo

Ampliar o webhook `src/routes/api/public/webhooks/asaas.ts` para tratar os eventos da aba **Transferências** e atualizar a tabela `withdrawals` conforme o Asaas processa cada saque do criador.

## Mapeamento evento → status

O enum `withdrawal_status` já tem os valores necessários (`requested`, `in_review`, `approved`, `paid`, `rejected`, `failed`) — nenhuma migration é preciso.

| Evento Asaas | Novo `withdrawals.status` |
|---|---|
| `TRANSFER_CREATED` | `requested` (só se ainda não estiver mais avançado) |
| `TRANSFER_PENDING` | `approved` |
| `TRANSFER_IN_BANK_PROCESSING` | `approved` |
| `TRANSFER_BLOCKED` | `in_review` |
| `TRANSFER_DONE` | `paid` + `processed_at = now()` |
| `TRANSFER_FAILED` | `failed` + `rejection_reason` (se vier no payload) |
| `TRANSFER_CANCELLED` | `rejected` |

## Mudanças no handler

1. Ler `payload.transfer` (id + status + externalReference) além de `payload.payment`. Nos eventos `TRANSFER_*` a fonte de verdade é `transfer.id`.
2. Idempotência continua funcionando via `asaas_events` (event_id já inclui o transfer id no fallback).
3. Localizar o saque: primeiro por `withdrawals.provider_ref = transfer.id`; se não achar, usar `externalReference` (que hoje devemos gravar como `withdrawals.id` quando disparamos a transferência — este handler apenas prepara o suporte).
4. Novo helper `applyTransferStatus(supabaseAdmin, withdrawalId, status, providerRef, extra?)`:
   - Update com `status`, `provider_ref`, `updated_at` (via trigger existente).
   - Para `paid`: também seta `processed_at`.
   - Para `failed`: grava `rejection_reason` se `transfer.failReason` estiver presente.
   - Nunca sobrescreve um saque já `paid` ou `failed` com um status intermediário chegando fora de ordem (guarda com `.not("status","in",("paid","failed","rejected"))` quando o novo status for `requested`/`approved`/`in_review`).
5. Se nenhum saque for encontrado, apenas loga `console.warn` e marca `asaas_events.processed_at` — não retorna erro (evita retries desnecessários).
6. Estrutura de decisão no POST fica:
   - Se `payload.payment` presente → fluxo atual de cobranças (já implementado).
   - Se `payload.transfer` presente → novo fluxo de transferências.
   - Caso contrário → apenas registra evento.

## Fora de escopo

- Criar de fato a chamada de transferência no Asaas (`POST /transfers`) e gravar `provider_ref` inicial: será um passo futuro em `payouts.functions.ts`. Este PR só prepara o webhook.
- Assinaturas (`SUBSCRIPTION_*`): próximo turno.
- UI de status de saque: sem mudança visual; as telas já mostram `status` cru.

## Arquivos afetados

- `src/routes/api/public/webhooks/asaas.ts` — novo bloco de eventos `TRANSFER_*` + helper `applyTransferStatus`.
