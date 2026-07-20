# Comportamento do botão "Virar creator"

Decisão: **manter o fluxo atual**. Nenhuma alteração de código necessária.

## Como funciona hoje (confirmado)

1. **Clique no botão** → navega para `creatorNextStep`, calculado em `src/routes/_authenticated/dashboard.tsx` (linhas 60–79). O primeiro passo é `/creator/onboarding/redes-sociais`, e o cálculo já sabe retomar do ponto certo (`redes-sociais` → `assinatura` → `documentos` → `verificando`) caso o usuário abandone no meio.

2. **Onboarding do creator** roda no mesmo `user_id`. Ao concluir:
   - `profiles.account_type` muda de `subscriber` para `creator`.
   - `profiles.onboarding_completed_at` é preenchido.
   - Um `creator_profiles` do tipo `paid` é gerado (backfill/trigger da fase 2 do Perfil Duplo).

3. **A "conta de assinante" não é separada** — é a mesma conta, agora com capacidades de creator. Continuam ativos e intactos:
   - Assinaturas que ele paga a outros creators (`subscriptions` onde ele é `subscriber_id`).
   - Saldo em `subscriber_wallets` e cartões salvos.
   - Favoritos/coleções, follows, histórico de chat.
   - Acesso pelas rotas `/subscriptions`, `/mywallet`, `/colecoes` (o `BottomNav` e o menu já expõem essas rotas para creators também).

4. **Dashboard** passa a renderizar `CreatorDashboard` no lugar do `SubscriberDashboard` porque `isCreatorLike(accountType)` vira `true`. O texto do botão já é dinâmico ("Virar creator" vs "Continuar cadastro de creator") conforme `creatorOnboardingStarted`.

## Nada a alterar

Sem edições. O comportamento atual atende à decisão escolhida.
