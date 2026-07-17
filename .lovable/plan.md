
## Contexto

Hoje há dois caminhos distintos para cartão de crédito no app:

- **Gorjeta, assinatura, contribuição de desafio, tip/promoção** — criam um `payment` no Asaas com `billingType: CREDIT_CARD` e redirecionam para o `invoiceUrl` (checkout hospedado Asaas). Sem tokenização, funciona.
- **"Adicionar cartão" e "Recarga 1-clique" (mywallet)** — usam `POST /v3/creditCard/tokenize` + cobrança com `creditCardToken`. Endpoint retorna **403** porque a API key ainda não tem essa permissão (usuário irá resolver depois).

A recarga em `/mywallet/recarregar` só oferece PIX. Objetivo: também oferecer cartão via checkout hospedado, igual ao restante do app. Cartões salvos e recarga 1-clique ficam como estão (usuário vai liberar a tokenização em breve).

## Escopo — Frontend

**`src/routes/_authenticated/mywallet.recarregar.tsx`**
- Adicionar seletor de método (PIX / Cartão) reusando `PaymentMethodPicker` sem a opção `WALLET`, ou botões locais equivalentes. Padrão: PIX.
- Ao continuar:
  - `PIX` → fluxo atual (`PixCheckout`).
  - `CREDIT_CARD` → chamar `createWalletTopupPayment({ method: "CREDIT_CARD" })` e renderizar `CardCheckout` com o `invoiceUrl` retornado (mesmo padrão de `TipDialog`/`SubscribeDialog`).
- Respeitar mínimo por método (`PAYMENT_MIN_GROSS_CENTS`) e usar `translatePaymentError` para erros.

## Escopo — Backend

**`src/lib/payments.functions.ts` → `createWalletTopupPayment`**
- Aceitar `method: "PIX" | "CREDIT_CARD"` no `inputValidator`.
- Quando `CREDIT_CARD`, criar `payment` com `billingType: "CREDIT_CARD"` (sem `creditCardToken`/`creditCard`) e retornar `{ paymentIntentId, invoiceUrl }`. O QR PIX só é gerado quando `method === "PIX"`.
- Validar mínimo com `assertMeetsMinimum`.

Nada muda no webhook `/api/public/webhooks/asaas` — ele já credita a carteira quando o pagamento (qualquer método) fica `RECEIVED/CONFIRMED` com o `externalReference` do topup.

## Fora de escopo

- Não mexer em `saved-cards.functions.ts` nem no fluxo de cartões salvos / recarga 1-clique.
- Não alterar gorjeta/assinatura/desafio (já funcionam).

## Verificação

1. `/mywallet/recarregar` mostra seletor PIX / Cartão; PIX gera QR como hoje.
2. Selecionando Cartão + Continuar, abre o checkout Asaas em nova aba (via `CardCheckout`); ao pagar, o webhook credita a carteira.
