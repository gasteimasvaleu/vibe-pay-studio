# Pagar com saldo da Carteira nos modais

Hoje os modais de pagamento (`PaymentMethodDialog`, `SubscribeDialog`, `TipDialog`, e o unlock de chat) só oferecem PIX e Cartão. Vamos adicionar "Carteira" como terceiro método, debitando o saldo do assinante e creditando a carteira do criador na mesma transação — sem passar pelo Asaas.

## Escopo (onde a opção aparece)

- Desbloqueio de publicação (`PaymentMethodDialog` em `PublicationCard`).
- Assinatura de criador (`SubscribeDialog`).
- Gorjeta / Mimo (`TipDialog`).
- Desbloqueio de mensagem no chat (`PriceDialog` / fluxo de chat unlock).

Fora de escopo (por enquanto): recarga da própria carteira, videochamadas, saques.

## Backend

**Nova server fn genérica** `payWithWalletBalance` em `src/lib/payments.functions.ts`, com `requireSupabaseAuth`:

Entrada: `{ kind: "publication_unlock" | "chat_unlock" | "subscription" | "tip", referenceId?, creatorId?, publicationId?, messageId?, plan?, amountCents?, message? }`.

Fluxo (em uma função Postgres `pay_with_wallet(...)` chamada via RPC para ser atômica):
1. Trava a linha de `subscriber_wallets` do comprador com `SELECT ... FOR UPDATE`.
2. Recalcula o `amount_cents` do lado servidor a partir do recurso (preço da publicação, do plano, da mensagem; tip usa `amountCents` validado).
3. Verifica `balance_cents >= amount_cents`; senão levanta `insufficient_funds`.
4. Debita `subscriber_wallets.balance_cents`.
5. Insere a linha no domínio correspondente já com `status='paid'` e `provider='wallet'` (para publicação e chat: `publication_unlocks` / `chat_message_unlocks`; para assinatura: `subscriptions` com `status='active'`; para tip: `tips` com `status='paid'`). Os triggers existentes (`*_sync_transaction` + `transactions_apply_wallet_effects`) já criam a `transactions` correta, aplicam o split de 15%, marcam `payment_method='wallet'` e creditam a carteira do criador imediatamente (`released_at = now()` para wallet).
6. Impede autocompra (buyer ≠ creator) — regras já existentes.

A função Postgres é `SECURITY DEFINER`, `search_path=public`, e valida `auth.uid() = _buyer_id`.

Retorno da server fn: `{ ok: true, transactionId, referenceId }` — sem `paymentIntentId` (não passa pelo Asaas).

## Frontend

**`PaymentMethodPicker`**: adicionar terceira opção "Carteira" (ícone Wallet, label com saldo atual formatado, desabilitada quando `balanceCents < amountCents` com hint "Saldo insuficiente — recarregar").

- Buscar saldo com `useQuery(["subscriber-wallet"], getSubscriberWallet)`.
- Passar `amountCents` como prop para o picker calcular disponibilidade.

**Tipos**: expandir `PaymentMethod` para `"PIX" | "CREDIT_CARD" | "WALLET"`.

**Modais**:
- `PaymentMethodDialog` (unlock de post): quando `method === "WALLET"`, chama `payWithWalletBalance({ kind: "publication_unlock", publicationId })` e ao sucesso fecha o modal e chama `onPaid` sem abrir checkout PIX/cartão. Invalidar `["subscriber-wallet"]` e a query da publicação.
- `SubscribeDialog`: idem para `kind: "subscription"` com `creatorId` + `plan`. Ao sucesso, fecha e mostra "Assinatura ativa".
- `TipDialog`: idem para `kind: "tip"` com `creatorId` + `amountCents` + `message`.
- `PriceDialog` (chat unlock): idem para `kind: "chat_unlock"` com `messageId`.

Quando saldo insuficiente, o botão "Confirmar" fica desabilitado e aparece link "Recarregar carteira" → `/mywallet/recarregar`.

## Segurança

- Preços são sempre recalculados no servidor — o cliente nunca informa `amountCents` (exceto tip, com valor mínimo já validado).
- Débito e crédito acontecem na mesma transação SQL, com `FOR UPDATE` para evitar race de saldo negativo.
- RLS mantida; a função é `SECURITY DEFINER` só para permitir o débito atômico da carteira do próprio usuário.
- Sem chamada ao Asaas, sem split externo — o split de comissão é aplicado pelo trigger `apply_transaction_split` já existente.

## Fora de escopo

- Reembolso automático para saldo em caso de estorno (já coberto parcialmente pelo trigger, mas não devolve à `subscriber_wallets`).
- Usar carteira para recarga de si própria ou saques.
