## Situação atual

Hoje o desbloqueio de story só usa **saldo da carteira** (`walletPay({ kind: "story_unlock" })`). Publicações, chat, tips, assinaturas, video call e recarga já têm PIX + cartão via Asaas. Falta a mesma opção para stories.

## O que muda

O `LockedOverlay` do `StoryViewer` deixa de chamar direto a carteira e passa a abrir o **mesmo seletor de método de pagamento** usado em publicações: **Carteira / PIX / Cartão salvo / Novo cartão**. Se houver saldo na carteira, ele continua sendo a opção padrão em destaque.

Fluxo por método:
- **Carteira** → `payWithWallet` (comportamento atual, débito imediato).
- **PIX** → gera QR + copia-e-cola, abre `PaymentModal` com `PixCheckout`; webhook Asaas marca `story_unlocks.status = paid`.
- **Cartão** (salvo ou novo) → cria charge no Asaas, abre `CardCheckout`; webhook confirma.

Ao confirmar pagamento (qualquer método), o viewer invalida `["creator-stories", creatorId]` e `["subscriber-wallet"]`, o story destrava e o auto-avanço retoma.

## Implementação

1. **`src/lib/payments.functions.ts`** — nova server fn `createStoryUnlockPayment({ storyId, method, card? })`, espelhando `createUnlockPayment`:
   - Valida story existente, não é auto-desbloqueio, `price_cents > 0`.
   - Upsert em `story_unlocks` com `status = "pending"` e `provider = asaas_pix|asaas_card`.
   - `asaas.createPayment` com `externalReference = "story_unlock:<id>"` e split para a carteira do creator (`computeCreatorNetCents`).
   - `recordIntent` com `referenceTable: "story_unlocks"`.

2. **`src/lib/payments-reconcile.server.ts`** — adicionar `"story_unlocks"` ao tipo `ReferenceTable`. `markStatusPaid` já funciona (coluna `status`, valor `paid`). Opcional: `notifyStoryUnlock` no futuro.

3. **`src/components/feed/StoryViewer.tsx` / `LockedOverlay`** — trocar o botão único "Desbloquear" por abrir o `PaymentMethodPicker` já existente. Ao escolher:
   - `WALLET` → fluxo atual (`payWithWallet`).
   - `PIX`/`CREDIT_CARD` → chamar `createStoryUnlockPayment`, montar `CheckoutData` e abrir `PaymentModal`. `onPaid` invalida queries e fecha o modal — o story destrava sem fechar o viewer.

4. **Nada muda no schema** — `story_unlocks` já tem colunas `status`, `provider`, `provider_ref`, `amount_cents`. Tabela e RLS existentes cobrem os dois novos métodos.

## Detalhes técnicos

- Reaproveitar `PaymentMethodPicker`, `PaymentModal`, `PixCheckout`, `CardCheckout` sem mudanças.
- `buildCardArgs` e `ensureCustomerId` já existem em `payments.functions.ts`.
- Webhook `/api/public/webhooks/asaas` não precisa de mudança: ele lê `metadata.referenceTable` do `payment_intents` e chama `applyPaidIntent`, que passará a aceitar `story_unlocks`.
- CPF continua obrigatório para PIX/cartão (mesmo `cpf_required` das outras compras); carteira segue não exigindo.
