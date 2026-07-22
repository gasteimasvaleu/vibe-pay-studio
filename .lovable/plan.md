## Problema

O toast `Cartão requer creditCardToken ou creditCard+creditCardHolderInfo` vem do `asaas.server.ts:createPayment`: hoje ele exige token/cartão quando `billingType=CREDIT_CARD`, mas a conta Asaas do usuário ainda **não tem tokenização liberada**. Tokenização fica só para a recarga 1-clique da carteira. Para compras (assinatura, mimo, unlock, story), o cartão deve ser cobrado via **checkout externo hospedado pelo Asaas** — que o `CardCheckout.tsx` já sabe abrir e polar.

## Causa exata

Para gerar um `invoiceUrl` hospedado onde o comprador digita o cartão no site do Asaas, a `/payments` precisa ser criada com `billingType=UNDEFINED` (comprador escolhe o método na tela do Asaas) — não `CREDIT_CARD`. Ao mandar `CREDIT_CARD` sem token, a própria checagem local (`asaas.server.ts:397`) lança o erro visto no toast.

## Solução

Rotear a chamada ao Asaas conforme o método escolhido pelo comprador, mantendo o UX atual:

- `PIX` → continua igual, `billingType=PIX` + QR code inline.
- `WALLET` → continua igual, débito de saldo.
- `CREDIT_CARD` → mudar para `billingType=UNDEFINED` no backend; o `invoiceUrl` retornado é o checkout hospedado que aceita cartão. O `CardCheckout.tsx` já abre em nova aba e faz polling do status — nenhuma mudança no componente.

Isso preserva:
- Split para o creator (o Asaas aplica o split mesmo em `UNDEFINED`, pelo `walletId`).
- Recarga 1-clique da carteira via `chargeSavedCardTopUp` (continua usando `CREDIT_CARD` + token, único caminho com tokenização).

## Passos

1. **`src/lib/asaas.server.ts`**
   - Expandir `AsaasBillingType` para incluir `"UNDEFINED"`.
   - Em `createPayment`, tratar `UNDEFINED` exatamente como PIX/BOLETO (sem exigir campos de cartão). Bloco `if (input.billingType === "CREDIT_CARD")` só é acionado quando um token/cartão é passado explicitamente (fluxo da recarga 1-clique).

2. **`src/lib/payments.functions.ts`** — nos handlers de compra que aceitam método do comprador:
   - `createSubscriptionPayment`
   - `createTipPayment`
   - `createChatUnlockPayment`
   - `createPublicationUnlockPayment`
   - `createStoryUnlockPayment` (e qualquer outro `createXxxPayment` que aceite `method: Method`)
   
   Mapear internamente: se `data.method === "CREDIT_CARD"`, chamar `asaas.createPayment({ billingType: "UNDEFINED", ... })`. Manter o campo `method: "CREDIT_CARD"` gravado no `payment_intents`/tabelas (não mudar contrato do frontend). Sem alterar splits nem `netCreatorCents`.

3. **`chargeSavedCardTopUp` (recarga)** — **não mexer**. Continua `billingType=CREDIT_CARD` + `creditCardToken`.

4. **Webhook `/api/public/webhooks/asaas.ts`** — verificar se o handler diferencia por `billingType` para atualizar status; se sim, tratar `UNDEFINED` cujo pagamento efetivo foi `CREDIT_CARD` (Asaas troca o `billingType` do evento pelo método real após o pagamento). Nenhuma alteração se ele já reage só ao `status` do evento.

5. **`PaymentModal.tsx` / `SubscribeDialog.tsx`** — o branch `isCard` já usa `CardCheckout` com `invoiceUrl`. Verificar que `invoiceUrl` volta sempre preenchido para `UNDEFINED` (o Asaas retorna). Ajustar mensagem interna do `CardCheckout` de "checkout seguro do Asaas" continua correta.

## Detalhes técnicos

- `billingType=UNDEFINED` no Asaas: cria a cobrança sem forçar método; `invoiceUrl` mostra opções (Cartão, PIX, Boleto). Como já rotulamos a preferência do usuário como "Cartão" na UI, e a tela do Asaas prioriza cartão, o UX percebido é o mesmo.
- Alternativa possível se o comportamento acima incomodar: usar `/paymentLinks` ou `/checkout` do Asaas para pré-selecionar cartão. Mais trabalho, deixar para uma iteração futura se necessário.
- Não alterar `AsaasBillingType` guardado no banco em `payment_intents.method` — a coluna reflete o método que o comprador **escolheu** na nossa UI (`CREDIT_CARD`), não o `billingType` enviado ao Asaas.

## Fora do escopo

- Trocar de provider.
- Formulário inline de cartão (foi meu plano anterior — descartado, tokenização não está liberada).
- Suporte a parcelamento / 3DS custom (só via checkout hospedado).
