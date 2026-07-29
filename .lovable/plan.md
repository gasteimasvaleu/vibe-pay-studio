## O que aconteceu

Ao adicionar um cartão no checkout inline, o app sempre chama `POST /creditCard/tokenize` no Asaas. Quando aquele cartão **já foi tokenizado antes para o mesmo cliente Asaas**, a API recusa e o erro cru do Asaas ("cartão já está tokenizado") vira toast — e o pagamento para ali.

Isso acontece principalmente quando: o usuário já cadastrou esse cartão antes e depois **removeu** em `/mywallet` (o token continua existindo no Asaas, mas a linha some de `saved_cards`), ou tentou duas vezes seguidas.

## Correção proposta

### 1. Reaproveitar cartão já salvo (caminho feliz)
Antes de tokenizar, em `tokenizeAndSaveCard`, procurar em `saved_cards` uma linha do próprio usuário com mesmo `last4` + `exp_month` + `exp_year`. Se existir, não chama o Asaas: retorna o `id` existente e o fluxo segue direto para a cobrança 1-click. Sem erro, sem cartão duplicado na lista.

### 2. Fallback quando o token existe só no Asaas
Se não há linha local e o Asaas responde "já tokenizado", em vez de falhar:
- criar a cobrança usando os **dados completos do cartão** (`creditCard` + `creditCardHolderInfo`), que `createPayment`/`createSubscription` já suportam;
- gravar em `saved_cards` o token que o Asaas devolve na resposta da cobrança (quando vier), para que as próximas compras voltem a ser 1-click.

Assim o pagamento que o usuário iniciou é concluído no mesmo clique, sem ele precisar entender o que é tokenização.

### 3. Mensagem amigável como última barreira
Se ainda assim falhar, `translatePaymentError` passa a traduzir esse erro para algo acionável em pt-BR, ex.: "Este cartão já está cadastrado. Selecione-o na lista de cartões salvos ou use PIX." — em vez do texto cru do gateway.

### 4. Evitar recriar o problema
`deleteSavedCard` hoje remove só a linha local. Passa a registrar que aquele token do Asaas foi desativado (ou simplesmente marcar a linha como removida em vez de apagá-la), para que o mesmo cartão possa ser reativado sem novo tokenize.

## Detalhes técnicos

- `src/lib/saved-cards.functions.ts`: lookup prévio por `last4/exp` em `tokenizeAndSaveCard`; `try/catch` no `tokenizeCreditCard` detectando o código de erro Asaas (`invalid_creditCard` com mensagem de já tokenizado) e retornando um marcador `{ needsRawCardCharge: true }`.
- `src/components/payments/NewCardCheckoutStep.tsx`: quando vier esse marcador, pular a fase "Tokenizando" direto para "Cobrando", enviando os dados do cartão à função de cobrança.
- `src/lib/payments.functions.ts`: aceitar, além de `savedCardId`, um payload opcional de cartão bruto nos endpoints de checkout (publicação, story, tip, live, assinatura, chat PPV, recarga) e repassar a `createPayment`.
- `src/lib/payment-limits.ts`: nova regra em `translatePaymentError`.
- Nenhuma mudança de schema obrigatória para os itens 1–3; o item 4 usa uma coluna `deleted_at` em `saved_cards` (migração pequena, com GRANTs já existentes).

## Enquanto isso

Para concluir o pagamento agora: escolher o cartão já existente na lista de cartões salvos em `/mywallet` (ou usar PIX). Se ele não aparecer na lista, é exatamente o caso do item 2.
