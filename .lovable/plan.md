
# Integração Asaas com Split de Pagamentos

Integrar a API do Asaas (produção) para processar pagamentos reais com split automático entre criador (85%) e plataforma (15%), substituindo o `provider: "manual"` atual em desbloqueios, tips, assinaturas, chats e recargas.

## 1. Secrets

Adicionar via `add_secret`:
- `ASAAS_API_KEY` — chave da conta principal (produção, `https://api.asaas.com/v3`).
- `ASAAS_WEBHOOK_TOKEN` — token que o Asaas enviará no header `asaas-access-token` para validar webhooks.

## 2. Schema (migration)

Adicionar em `profiles`:
- `asaas_customer_id` TEXT — cliente Asaas do usuário (para cobrança).
- `asaas_wallet_id` TEXT — walletId da subconta do criador (recebe o split).
- `asaas_account_id` TEXT — id interno da subconta.
- `asaas_account_status` TEXT — `pending` / `active` / `rejected`.

Adicionar em `payment_intents`:
- `asaas_payment_id` TEXT UNIQUE, `asaas_invoice_url` TEXT, `pix_qr_code` TEXT, `pix_copy_paste` TEXT, `method` TEXT (`PIX`/`CREDIT_CARD`), `metadata` JSONB.

Nova tabela `asaas_events` (idempotência dos webhooks): `id`, `event_id` UNIQUE, `event_type`, `payload` JSONB, `processed_at`, `created_at`.

Constante da comissão: alterar default de `apply_transaction_split` para `15.00`.

## 3. Cliente Asaas (server-only)

`src/lib/asaas.server.ts` — helper `asaasFetch(path, init)` com `access_token` header, base URL de produção, tratamento de erro com status + body.

Funções: `createCustomer`, `createSubaccount`, `getSubaccountStatus`, `createPayment` (PIX/cartão com `split: [{ walletId, percentualValue: 85 }]`), `getPixQrCode`, `refundPayment`.

## 4. Server functions

`src/lib/payments.functions.ts` (todos com `requireSupabaseAuth`):
- `ensureAsaasCustomer()` — cria/reaproveita cliente para o usuário logado.
- `createCreatorSubaccount()` — chamada após KYC aprovado; cria subconta Asaas e salva `wallet_id`.
- `createUnlockPayment({ publicationId, method })` — cria publication_unlock (`status: pending`) + cobrança Asaas com split para o autor, retorna QR/URL.
- `createTipPayment({ creatorId, amountCents, method, message })` — idem para tips.
- `createSubscriptionPayment({ creatorId, plan, method })` — cobrança de assinatura com split.
- `createChatUnlockPayment({ messageId, method })` — idem.
- `createVideoCallPayment({ callId, method })` — idem.
- `createWalletTopupPayment({ amountCents, method })` — recarga sem split (100% plataforma, credita wallet do assinante ao pagar).

Cada uma insere `payment_intents` com `asaas_payment_id` para reconciliação.

## 5. Webhook Asaas

`src/routes/api/public/webhooks/asaas.ts` (POST):
1. Valida header `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN`.
2. Insere em `asaas_events` (UNIQUE em `event_id`) — se conflito, retorna 200 (idempotente).
3. Trata eventos:
   - `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` → localiza `payment_intents` pelo `asaas_payment_id`, atualiza a tabela de origem (`publication_unlocks`, `tips`, etc.) para `status='paid'` — os triggers existentes já criam a `transactions` e movem os saldos.
   - `PAYMENT_REFUNDED` → marca `refunded` (triggers estornam wallet).
   - `PAYMENT_OVERDUE` / `PAYMENT_DELETED` → `cancelled`.
4. Usa `supabaseAdmin` (carregado dentro do handler).

## 6. Onboarding do criador

No fim de `creator.onboarding.documentos.aprovado.tsx` (ou trigger de aprovação KYC), chamar `createCreatorSubaccount`. Bloquear criação de conteúdo pago se `asaas_wallet_id` estiver nulo.

## 7. UI

- Checkout PIX: modal com QR code + copia-e-cola + polling do status via `getPaymentIntent`.
- Checkout cartão: formulário com tokenização client-side do Asaas (`/v3/creditCard/tokenize`) → envia token ao server fn.
- Ajustar telas de desbloqueio de publicação, tip, assinatura, chat pago e recarga de wallet para consumir as novas server fns.

## 8. Split e comissão

- Migration altera default de `apply_transaction_split` para 15%.
- Todos os `createPayment` enviam `split: [{ walletId: creator.asaas_wallet_id, percentualValue: 85 }]`.
- Recarga de wallet não envia split.

## 9. Fora do escopo agora

- Boleto (não solicitado).
- Sandbox (produção direto).
- Saques via Asaas Transfer API — pode ser feito em fase separada; por ora `withdrawals` continua manual pelo admin.

## Detalhes técnicos

- `src/lib/asaas.server.ts` é `.server.ts` (import só dentro de handlers em `.functions.ts` e no webhook route).
- Todos os valores em centavos internamente; converter para reais (`value = cents/100`) só na chamada ao Asaas.
- Nunca logar `ASAAS_API_KEY` nem payloads com dados de cartão.
- Webhook em `/api/public/*` para bypass de auth; segurança via token.
