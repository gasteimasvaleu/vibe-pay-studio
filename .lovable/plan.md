# Ticket da live: aceitar PIX, cartão e saldo (como os outros produtos)

Hoje a página `/live/$liveId` só oferece "Comprar com saldo" (`payWithWallet`). Vou expandir para o mesmo padrão de `TipDialog` / `SubscribeDialog`: um diálogo com `PaymentMethodPicker` (PIX / Cartão / Saldo) e, para PIX/cartão, um `PaymentModal` alimentado por uma nova server fn `createLiveTicketPayment`.

## Mudanças

### 1. Backend — `src/lib/payments.functions.ts`
Nova server fn `createLiveTicketPayment` (espelha `createVideoCallPayment`):
- Valida `{ liveId, method, card? }`.
- Carrega `live_sessions` (`creator_id`, `price_cents`, `status`); rejeita se `ended`, se `price_cents <= 0`, ou se o comprador for o dono.
- Se já existe `live_tickets` `paid` do buyer para esta live, retorna cedo (idempotente).
- Cria/reusa um `live_tickets` `pending` desse buyer (upsert por `(live_id, buyer_id)` — a constraint única já garante uma linha).
- `ensureCustomerId`, `getCreatorWallet(supabase, creator_id)`, `asaas.createPayment(...)` com `externalReference: "live_tickets:<ticketId>"` e descrição neutra "Compra MTX".
- Atualiza o ticket com `provider = providerForMethod(method)` e `provider_ref = payment.id`.
- Registra intent via `recordIntent(supabase, { asaasPayment, method, referenceTable: "live_tickets", referenceId: ticketId, pixQr })`.
- Retorna `CheckoutResult` padrão.

### 2. Backend — `src/lib/payments-reconcile.server.ts`
- Adicionar `"live_tickets"` ao union `ReferenceTable`.
- `markStatusPaid` já funciona (usa coluna `status`, valor `"paid"`) para `live_tickets` — nenhuma mudança extra.
- Notificações por e-mail não são requisito agora (nenhum `notifyLiveTicket` existe); deixamos passar.

### 3. Frontend — novo `src/components/live/LiveTicketDialog.tsx`
Componente análogo ao `TipDialog`:
- Props: `{ open, onOpenChange, liveId, creatorName, priceCents, onPaid }`.
- Estado: `method: PaymentMethod` (default `"PIX"`), `loading`, `checkout`.
- Submit:
  - `WALLET` → `payWithWallet({ kind: "live_ticket", liveId, amountCents: priceCents })`; on `paid`/`already` chama `onPaid()`.
  - `PIX`/`CREDIT_CARD` → `createLiveTicketPayment({ liveId, method })` → abre `PaymentModal` com o retorno; `onPaid` do modal chama o `onPaid` do componente.
- Usa `PAYMENT_MIN_GROSS_CENTS` para desabilitar quando o preço não bate no mínimo do método (o valor é fixo, ainda assim exibe o aviso).
- Layout: header com título "Comprar acesso à live" e preço formatado; `PaymentMethodPicker`; botão primário "Pagar R$ X,XX".

### 4. Frontend — `src/routes/_authenticated/live.$liveId.index.tsx`
- Remover `handleBuyTicket` e o `useServerFn(payWithWallet)` locais.
- Trocar o botão inline do paywall por um `<button>` que abre `LiveTicketDialog`.
- No `onPaid` do diálogo: `toast.success("Acesso liberado!")` e `refetch()`.

## Fora de escopo

- Não altera esquema de banco. `live_tickets` já tem `status`, `provider`, `provider_ref` e o trigger `live_tickets_sync_transaction` cuida do lançamento em `transactions` quando o webhook marcar como paid.
- Não mexe em `LiveDonorsPanel` nem em preços/split.
- Não muda o fluxo de saldo existente do lado do server (`pay_with_wallet` já suporta `_kind = "live_ticket"`).
