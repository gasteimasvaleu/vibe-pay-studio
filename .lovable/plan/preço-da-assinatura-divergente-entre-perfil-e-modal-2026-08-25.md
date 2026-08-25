# Preço da assinatura divergente entre perfil e modal

## Causa confirmada

Há duas fontes de preço no banco e cada tela lê uma:

- A página do perfil lê `creator_profiles.price_monthly` → para o Monetisexy: **R$ 29,00**.
- O modal "Assinar" lê `profiles.price_monthly` (campo legado, de antes dos múltiplos perfis) → **R$ 19,90**.

O servidor que efetivamente cobra (`subscribeToCreator`) usa `creator_profiles`, ou seja **o preço correto é o do perfil (R$ 29,00)** e o modal é que está exibindo um valor antigo.

## Correção

1. `SubscribeDialog` passa a receber o `creatorProfileId` do perfil sendo visualizado e busca preço/descontos em `creator_profiles` (com fallback por `user_id` para o perfil pago, igual à regra do servidor).
2. O modal envia `creatorProfileId` ao criar o pagamento, garantindo que o valor exibido e o cobrado sejam sempre da mesma linha.
3. Sem migração: o campo legado em `profiles` fica intacto, apenas deixa de ser usado para exibir preço de assinatura.

## Detalhes técnicos

- `src/components/payments/SubscribeDialog.tsx`: nova prop opcional `creatorProfileId`; `priceQuery` consulta `creator_profiles` (`price_monthly, discount_quarterly, discount_semiannual`) por `id` quando disponível, senão por `user_id` escolhendo `kind = 'paid'`; repassar `creatorProfileId` em `createSubscriptionPayment`/`payWithWallet`.
- `src/routes/_authenticated/perfil.$username.tsx`: passar `creatorProfileId={profile.id}` na chamada do `SubscribeDialog` (o loader já carrega `creator_profiles.id`).
