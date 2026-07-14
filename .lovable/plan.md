## Problema

`profiles.price_monthly` é **numeric em reais** (ex.: `29.00` = R$ 29,00), mas o modal de assinatura e o server function de cobrança tratam esse valor como **centavos**. Resultado: quando o criador cadastra R$ 29, o modal mostra R$ 0,29 e a cobrança na Asaas também sai como R$ 0,29.

A página do perfil já trata o valor corretamente como reais, por isso mostra R$ 29 no card lateral e R$ 0,29 no modal.

## Correção

Converter `price_monthly` (reais) para centavos multiplicando por 100 nos dois lugares que produzem `amountCents`.

### 1. `src/components/payments/SubscribeDialog.tsx`
No cálculo de `totals`, multiplicar `monthly` por 100 ao gerar `cents`:

```ts
monthly:   { months: 1, cents: Math.round(monthly * 100), discount: 0 },
quarterly: { months: 3, cents: Math.round(monthly * 100 * 3 * (1 - discountQ / 100)), discount: discountQ },
semiannual:{ months: 6, cents: Math.round(monthly * 100 * 6 * (1 - discountS / 100)), discount: discountS },
```

Nenhuma outra mudança no componente — o resto do fluxo já usa `t.cents / 100` para exibir e envia apenas `{ creatorId, plan, method }` para o servidor.

### 2. `src/lib/payments.functions.ts` — `createSubscriptionPayment`
Trocar:
```ts
const gross = creator.price_monthly * months;
const amountCents = Math.round(gross * (1 - (discount ?? 0) / 100));
```
por:
```ts
const grossCents = Number(creator.price_monthly) * 100 * months;
const amountCents = Math.round(grossCents * (1 - (discount ?? 0) / 100));
```

Isso garante que Asaas seja chamada com o valor correto em centavos e que `subscriptions.price_cents_paid` também fique correto.

## Fora de escopo

- Não alterar o schema (`price_monthly` permanece `numeric` em reais).
- Não mexer em outros checkouts (tips, unlocks, video calls) — o problema é específico da assinatura.
