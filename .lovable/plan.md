# Cartão não salvo: UX própria confirmada + correção de erros de build

## Parte A — Erros de build a corrigir primeiro

O typecheck está quebrado em dois links que apontam para rotas inexistentes
(`/u/$username` e `/$username`). A rota real é `/perfil/$username`. Isso também
quebra a inferência do `Route.useLoaderData()` em `perfil.$username.tsx`, o que
gera os erros "Property 'viewerId' does not exist on type 'undefined'" — o loader
em si está correto, os erros são cascata.

- `src/components/live/LiveOverlayTop.tsx` linha 24: `to="/u/$username"` → `to="/perfil/$username"`
- `src/routes/_authenticated/admin.users.$userId.tsx` linha 173: `to="/$username"` → `to="/perfil/$username"`

## Parte B — Cartão não salvo (o que o código mostra hoje)

Você está certo: **cartão novo também não abre o checkout hospedado do Asaas**.
Quando o usuário escolhe "Cartão" sem ter cartão salvo (ou clica em "Usar outro
cartão"), o `PaymentMethodPicker` abre automaticamente o `NewCardCheckoutStep`,
que é a nossa UX própria:

- Passo 1 "Tokenizando cartão" → Passo 2 "Processando pagamento" → Passo 3 "Confirmado"
- Trilha animada entre os passos, spinner no passo ativo, check nos concluídos,
  estado de erro com "Falha — ajuste os dados e tente novamente"
- Depois de tokenizar, chama `onNewCardTokenized(savedCardId)`, que dispara a
  mesma cobrança 1-click do cartão salvo. O dialog só fecha quando resolve.

### O que ainda existe e não deveria

No servidor, `resolveCardArgs` só usa `billingType: "CREDIT_CARD"` quando há
`savedCardId`. Sem ele, cai em `billingType: "UNDEFINED"`, que devolve
`invoiceUrl` do Asaas — e os diálogos ainda têm o ramo que renderiza
`CardCheckout` ("Abra o checkout seguro do Asaas").

Na prática a UI nunca chega nesse ramo, porque o picker sempre tokeniza antes.
Mas é código morto que pode reaparecer em qualquer regressão e levar o usuário
para fora do app.

### O que será feito

1. **Fechar a porta no servidor** — com `method: "CREDIT_CARD"` e sem
   `savedCardId` nem dados de cartão, retornar erro claro
   (`card_token_required`) em vez de gerar `invoiceUrl`.
2. **Remover os ramos de `CardCheckout`** dos diálogos de pagamento, deixando
   apenas PIX no estado de checkout pós-criação.
3. **Excluir `src/components/payments/CardCheckout.tsx`** após remover as
   referências.
4. **Mensagem amigável** — mapear `card_token_required` em
   `translatePaymentError` para "Não foi possível validar o cartão. Tente
   novamente ou use PIX."

## Escopo técnico

- Ajuste: `src/components/live/LiveOverlayTop.tsx`, `src/routes/_authenticated/admin.users.$userId.tsx`
- Ajuste: `src/lib/payments.functions.ts` (`resolveCardArgs` / `asaasBillingTypeForMethod`)
- Ajuste: `src/lib/payment-limits.ts` (tradução do novo erro)
- Ajuste: `TipDialog.tsx`, `SubscribeDialog.tsx`, `LiveTicketDialog.tsx`,
  `ChallengeContributeSheet.tsx` e demais pontos que renderizam `CardCheckout`
- Remoção: `src/components/payments/CardCheckout.tsx`
- Sem mudanças de banco, RLS, nem no `NewCardCheckoutStep` (a UX de steps
  permanece exatamente como está)
