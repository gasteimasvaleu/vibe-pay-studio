## Problema

No fluxo inline de cartão (Story, Live, Tip, Assinatura, Chat/PPV, Desafio), quando o usuário não tem cartão salvo e clica em "Cartão":

1. Abre o dialog `NewCardCheckoutStep`
2. Usuário preenche e clica **"Adicionar cartão"**
3. `tokenizeAndSaveCard` roda com sucesso (webhook chega no Asaas)
4. `PaymentMethodPicker.onSuccess` apenas seta `savedCardId` e fecha o dialog
5. **Nada mais acontece** — o usuário precisaria clicar novamente no botão "Desbloquear/Pagar" do dialog pai

Ou seja, a tokenização e a cobrança são dois cliques desconectados. O rótulo "Adicionar cartão" também não deixa claro que o pagamento ainda não ocorreu.

## Solução

Encadear tokenização + cobrança 1‑click no mesmo clique, sem mudar as server functions nem a lógica de negócio.

### 1. `PaymentMethodPicker.tsx`
- Nova prop opcional `onNewCardTokenized?: (savedCardId: string) => void | Promise<void>`.
- Passar `submitLabel={amountCents ? "Pagar R$ X" : "Adicionar cartão"}` para `NewCardCheckoutStep` (deixa o botão explícito).
- Em `onSuccess` do `NewCardCheckoutStep`:
  1. `onSavedCardChange(newId)`
  2. Se `onNewCardTokenized` presente → `await onNewCardTokenized(newId)`
  3. Fechar o dialog só depois (tratando erro com toast e mantendo o dialog aberto se o charge falhar, para o usuário poder tentar de novo).

### 2. Callers
Cada caller que hoje faz "unlock/pay" com `savedCardId` passa `onNewCardTokenized={(id) => runCharge(id)}`, chamando a mesma mutation existente com o id recém-tokenizado (sem depender do state assíncrono `savedCardId`):

- `src/components/feed/StoryViewer.tsx` (unlock de story)
- `src/components/live/LiveTicketDialog.tsx`
- `src/components/payments/TipDialog.tsx`
- `src/components/payments/SubscribeDialog.tsx`
- `src/components/payments/ChallengeContributeSheet.tsx`
- `src/components/payments/PaymentMethodDialog.tsx` (usado em feed/perfil/chat) — reutilizar `onConfirm(method, id)` passando o id novo.

Nenhuma mudança em server functions, webhooks ou reconciliação — apenas fecha o loop de UX entre tokenização e charge 1‑click.

## Detalhes técnicos

- Manter o comportamento atual: se `onNewCardTokenized` não for passado, o dialog só salva o cartão (fluxo `/mywallet` "Adicionar cartão" continua igual).
- Em caso de erro na cobrança pós-tokenização, mostrar toast e deixar o dialog aberto com o cartão já salvo selecionado para retry pelo botão principal do modal pai.
- `NewCardCheckoutStep` já suporta `onSuccess` async, então não precisa refactor interno.