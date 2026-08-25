# Cartão não salvo: confirmar UX própria e remover o fallback do checkout Asaas

## O que os arquivos mostram hoje

Você está certo: **cartão novo também não abre o checkout hospedado do Asaas**.
Quando o usuário escolhe "Cartão" sem ter cartão salvo (ou clica em "Usar outro
cartão"), o `PaymentMethodPicker` abre automaticamente o formulário
`NewCardCheckoutStep`, que é a nossa UX própria:

- Passo 1 "Tokenizando cartão" → Passo 2 "Processando pagamento" → Passo 3 "Confirmado"
- Trilha animada entre os passos, spinner no passo ativo, check nos concluídos,
  ícone de erro com mensagem "Falha — ajuste os dados e tente novamente"
- Após tokenizar, ele chama `onNewCardTokenized(savedCardId)`, que dispara a
  mesma cobrança 1-click do cartão salvo. O dialog só fecha quando a cobrança
  resolve.

## O que ainda existe e não deveria

No servidor, `resolveCardArgs` só usa `billingType: "CREDIT_CARD"` quando há
`savedCardId`. Sem ele, cai em `billingType: "UNDEFINED"`, que retorna
`invoiceUrl` do Asaas — e os diálogos ainda têm o ramo que renderiza
`CardCheckout`, a tela "Abra o checkout seguro do Asaas".

Na prática a UI nunca chega nesse ramo, porque o picker sempre tokeniza antes.
Mas é código morto que pode voltar a aparecer em qualquer regressão (por exemplo,
se a tokenização falhar em algum fluxo novo) e leva o usuário para fora do app.

## O que será feito

### 1. Fechar a porta no servidor
Nos fluxos de cobrança com `method: "CREDIT_CARD"` e sem `savedCardId` nem dados
de cartão, retornar um erro claro (`card_token_required`) em vez de gerar um
`invoiceUrl`. Assim o app nunca produz um link de checkout externo.

### 2. Remover os ramos de `CardCheckout`
Tirar o ramo `checkout.method === "CREDIT_CARD" && checkout.invoiceUrl` dos
diálogos de pagamento, deixando somente PIX no estado de checkout pós-criação.
O caminho de cartão termina dentro do `NewCardCheckoutStep`.

### 3. Aposentar o componente
Excluir `src/components/payments/CardCheckout.tsx` depois de remover as
referências.

### 4. Mensagem de erro amigável
Mapear `card_token_required` em `translatePaymentError` para algo como
"Não foi possível validar o cartão. Tente novamente ou use PIX."

## Escopo técnico

- Ajuste: `src/lib/payments.functions.ts` (`resolveCardArgs` / `asaasBillingTypeForMethod`)
- Ajuste: `src/lib/payment-limits.ts` (tradução do novo erro)
- Ajuste: `TipDialog.tsx`, `SubscribeDialog.tsx`, `LiveTicketDialog.tsx`,
  `ChallengeContributeSheet.tsx` e demais pontos que renderizam `CardCheckout`
- Remoção: `src/components/payments/CardCheckout.tsx`
- Sem mudanças de banco, RLS ou no `NewCardCheckoutStep` (a UX de steps
  permanece exatamente como está)
