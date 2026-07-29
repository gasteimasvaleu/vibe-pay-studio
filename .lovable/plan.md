
Com a tokenização Asaas funcionando, podemos eliminar o redirecionamento para a `invoiceUrl` no cartão e usar o token salvo para cobrar direto no app — inclusive assinaturas recorrentes automáticas.

## O que muda para o usuário

1. **Checkout de cartão dentro do app**: ao escolher "Cartão" em qualquer compra (recarga, tip, PPV, story, DM, live ticket, videochamada, assinatura), o app mostra a lista de cartões salvos + opção "Adicionar novo cartão". A cobrança é aprovada instantaneamente sem sair do Monetisexy.
2. **Assinaturas recorrentes reais**: com token, criamos `/v3/subscriptions` na Asaas (renovação automática mensal/trimestral/semestral). Não precisa mais o botão "Renovar" manual — o cron atual vira só fallback para expiração/falha.
3. **1‑click**: cartão salvo cobra sem redigitar CVV.

## Escopo técnico

### Backend (novas / alteradas server functions)

- `chargeSavedCardTopUp` (já existe) — servir de modelo. Ampliar para todos os fluxos:
  - `payments.functions.ts`: em `createPublicationUnlockPayment`, `createStoryUnlockPayment`, `createChatUnlockPayment`, `createTipPayment`, `createPaidDmPayment`, `createLiveTicketPayment`, `createVideoCallPayment`, `createWalletTopupPayment` — aceitar `savedCardId?: string`. Quando presente + método `CREDIT_CARD`, buscar `saved_cards`, chamar `asaas.createPayment` com `creditCardToken`, e retornar `{ paymentIntentId, status: 'CONFIRMED'|... }` sem `invoiceUrl` (não redireciona).
  - `createSubscriptionPayment`: quando `savedCardId` + `CREDIT_CARD`, chamar `asaas.createSubscription` (em vez de `createPayment`) com `creditCardToken`, `cycle` derivado do plano, `nextDueDate = hoje`. Persistir `asaas_subscription_id`. Registrar `payment_intents` da primeira cobrança conforme webhook.
- Novo helper `chargeWithSavedCard(supabase, userId, savedCardId, params)` em `saved-cards.functions.ts` (ou `payments-cards.server.ts`) para deduplicar a lógica de resolver token + cobrar + registrar intent.
- Webhook `asaas.ts`: já processa `PAYMENT_CONFIRMED`. Verificar tratamento de eventos `SUBSCRIPTION_*` e cobranças filhas da subscription (usar `payment.subscription` para vincular à `subscriptions.asaas_subscription_id` e estender `current_period_end`).

### Frontend

- **`PaymentMethodPicker`** (já existe): incluir grid dos cartões salvos (marca + last4) + card "Novo cartão" (abre o dialog de adicionar cartão em `mywallet.index.tsx`, reaproveitando o componente). Devolve `{ method, savedCardId? }`.
- **`PaymentModal` / `CardCheckout`**: quando cobrança nasce já `CONFIRMED` (fluxo com token), pular o iframe e mostrar tela de sucesso + callback `onPaid` imediato. `CardCheckout` iframe permanece apenas como fallback quando o usuário escolhe "Novo cartão" sem salvar.
- Consumidores: `mywallet.recarregar.tsx`, `TipDialog`, `SubscribeDialog`, `PaymentMethodDialog` (posts/stories/DM/ticket/videocall) — passar `savedCardId` selecionado ao chamar a server function.
- `settings.subscription.tsx`: mostrar estado "Renovação automática ativa" quando `asaas_subscription_id` existir; botão para cancelar recorrência (`asaas.cancelSubscription`) mantendo o período pago.

### Banco

- Migração leve: garantir `subscriptions.asaas_subscription_id text` (checar se já existe; se sim, sem alterações) e um índice único parcial para evitar duplicatas.

## Segurança

- Nunca receber PAN no frontend após salvar — só o `savedCardId` (uuid interno). Token Asaas fica só no servidor.
- Reconfirmar `saved_cards.user_id = auth.uid()` em toda cobrança (já feito em `chargeSavedCardTopUp`; replicar).
- Recorrência: cancelamento no Asaas obrigatório quando usuário deleta o cartão vinculado a uma subscription ativa (bloquear delete ou cancelar sub antes).

## Ordem de implementação sugerida

1. Extrair helper `chargeWithSavedCard` + estender `createWalletTopupPayment` para aceitar `savedCardId` (menor risco, valida fluxo E2E).
2. Ampliar `PaymentMethodPicker` + `PaymentModal` para fluxo "confirmado direto".
3. Propagar para tip / PPV / story / DM / ticket / videocall.
4. Assinatura recorrente (`createSubscription` + tratamento de webhook `SUBSCRIPTION_*`).
5. UI de gestão de recorrência em `settings.subscription`.

Quer que eu comece pelo passo 1 (recarga com cartão salvo, sem iframe) ou já vá direto para o fluxo completo incluindo assinatura recorrente?
