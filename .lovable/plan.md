# Assinatura recorrente automática (Asaas /v3/subscriptions)

Reativar renovação automática usando o endpoint `/v3/subscriptions` do Asaas, **restrito a cartão de crédito com token salvo** (agora que a tokenização foi liberada). PIX/Boleto continuam com renovação manual + lembrete por e-mail, pois o Asaas não recorre nesses métodos sem token.

## Escopo por método

- **CREDIT_CARD + savedCardId** → cria `/v3/subscriptions` no Asaas com `creditCardToken`, `cycle` e split. Renovação automática real.
- **CREDIT_CARD sem cartão salvo** → cobrança única do 1º ciclo (comportamento atual); UI oferece salvar cartão + ativar auto-renew depois.
- **PIX / BOLETO** → mantém fluxo atual (cobrança avulsa + lembrete manual). `auto_renew=false`.

## Mudanças

### 1. Backend — criação da assinatura
Arquivo: `src/lib/payments.functions.ts` (`createSubscriptionPayment`)
- Após criar a cobrança do 1º ciclo, se `method === "CREDIT_CARD"` e `savedCardId` presente, chamar `createAsaasSubscription` (já existe em `asaas.server.ts`) com:
  - `cycle` derivado do plan (`monthly→MONTHLY`, `quarterly→QUARTERLY`, `semiannual→SEMIANNUALLY`)
  - `nextDueDate` = `current_period_end` (yyyy-MM-dd)
  - `creditCardToken` do cartão salvo
  - `externalReference: subscription:<id>`
  - split idêntico ao pagamento
- Persistir `asaas_subscription_id` e `auto_renew=true` em `subscriptions`.

### 2. Webhook — eventos SUBSCRIPTION_* e PAYMENT_* recorrentes
Arquivo: `src/routes/api/public/webhooks/asaas.ts`
- Remover o bloco que hoje ignora `SUBSCRIPTION_*`.
- Para `PAYMENT_CREATED` vindo de assinatura (payload contém `payment.subscription`), criar um novo `payment_intent` vinculado à `subscriptions.id` para o novo ciclo, se ainda não existir.
- Ao receber `PAYMENT_CONFIRMED/RECEIVED` de uma cobrança de assinatura: estender `current_period_end` em +1 ciclo, marcar `status='active'`, registrar `transactions` (kind `subscription`) via `applyPaidIntent` (já reconcilia split/wallet).
- Ao receber `PAYMENT_OVERDUE` ou falha de cartão em ciclo recorrente: setar `status='past_due'` e disparar e-mail informando falha.
- Ao receber `SUBSCRIPTION_DELETED`/`SUBSCRIPTION_INACTIVATED`: setar `status='cancelled'`, `auto_renew=false`.

### 3. Cancelamento
`src/lib/monetization.functions.ts` (`cancelSubscription`)
- Se `asaas_subscription_id` presente, chamar `deleteAsaasSubscription(id)` antes do UPDATE.
- Mantém acesso até `current_period_end`; `auto_renew=false`, `cancelled_at=now`.
- Adicionar `reactivateSubscription` (novo server fn) que recria `/v3/subscriptions` no Asaas caso o usuário mude de ideia antes do vencimento e tenha cartão salvo.

### 4. Status na UI
Página `/subscriptions` (`src/routes/_authenticated/subscriptions.tsx`)
- Adicionar badges de status: **Ativa (auto-renova)**, **Ativa (renovação manual)**, **Pendente**, **Falha no pagamento**, **Cancelada — expira em X**, **Expirada**.
- Botão "Cancelar renovação" (quando `auto_renew=true`) e "Reativar renovação" (quando cancelada + ainda dentro do período + tem cartão salvo).
- Se não houver cartão salvo, oferecer atalho para `/mywallet` antes de ativar auto-renew.

### 5. Migração de schema
Nenhuma coluna nova é necessária — `asaas_subscription_id`, `auto_renew`, `cancelled_at`, `status` já existem. Apenas ampliar o enum de status caso `past_due` ainda não exista (verificar antes da migração).

### 6. Lembretes por e-mail
`src/routes/api/public/hooks/subscription-reminders.ts`
- Enviar apenas para assinaturas com `auto_renew=false` (PIX/Boleto ou cartão sem token). Cartão recorrente já cobra sozinho.
- Adicionar aviso 3 dias antes quando `auto_renew=true` para permitir cancelamento.

## Detalhes técnicos

- **Split**: o Asaas replica o `split` da assinatura em cada cobrança recorrente automaticamente; passamos o mesmo `walletId + fixedValue` do 1º ciclo.
- **Reconciliação**: `applyPaidIntent` já cuida de creditar wallet do criador e registrar `transactions`; basta que o webhook crie o intent do novo ciclo com `referenceTable='subscriptions'`, `referenceId=<subscription.id>`.
- **Idempotência**: `asaas_events.event_id` + `payment_intents.asaas_payment_id` continuam sendo as chaves anti-duplicação.
- **Retentativa Asaas**: em falha de cartão, o Asaas dispara `PAYMENT_OVERDUE` após retries automáticos — nesse ponto marcamos `past_due` e enviamos e-mail pedindo atualização do cartão.
- **Admin** (`/admin/subscriptions`): passa a mostrar `asaas_subscription_id` e botão "Cancelar no Asaas" para suporte.
