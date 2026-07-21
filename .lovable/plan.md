## Confirmado
- Seguidores e assinantes são **por `creator_profile_id`**.
- Perfil `kind='free'` **não vende assinatura**: sem preço, sem checkout, sem card de assinatura, sem aba "Assinantes" no dashboard quando o perfil ativo é free. Só segue/seguidores.

## Fase 1 — `creator_profiles` como fonte da verdade
- Migration de backfill idempotente para as linhas `creator_profiles` existentes, copiando de `profiles.*` (paid) e `profiles.free_*` (free): `username`, `display_name`, `avatar_url`, `cover_url`, `bio`, `price_monthly`, `discount_*`, `chat_welcome_*`, redes sociais.
- Validar colisões e adicionar `UNIQUE(username)` em `creator_profiles`.
- Constraint: `price_monthly` deve ser `NULL` quando `kind='free'` (trigger de validação, não CHECK).
- Helper server `resolveActiveCreatorProfile(userId)` — retorna a linha ativa de `creator_profiles`.

## Fase 2 — Leituras de identidade migradas
Trocar leituras de `profiles.username/avatar_url/display_name/bio/cover_url` + fallback `free_*` por `creator_profiles` via `active_profile_id`:
- `dashboard.tsx`, `TopNav`, `BottomNav`, `publisher.tsx`, `CreatorDashboard.switchBar`.
- Loaders de `profile.$username.tsx` e `perfil.$username.tsx`: lookup por `creator_profiles.username` (deduz `user_id`, `kind`, `creator_profile_id`).

## Fase 3 — Contadores e listas escopadas ao perfil
- `perfil.$username` loader: `postsCount`, `mediaCount`, `photos/videos/lockedCount`, `likesCount` filtrados por `creator_profile_id`.
- `/profile/$username`: estender filtro a mídias.
- `/my-monetisex-stats`, `/follow`, dashboard cards: escopar por `creator_profile_id`.

## Fase 4 — Follows por perfil, assinaturas só no pago
- `monetization.functions.followCreator / unfollowCreator / isFollowing`: recebem `creatorProfileId`; escrevem/leem `follows.creator_profile_id`. Seguir o pago **não** segue o gratuito.
- `listMySubscribers / listMyFollowees` e `stats.functions`: agrupar por `creator_profile_id`.
- `perfil.$username` loader: `followRow`, `followersCount` por `creator_profile_id`.
- **Assinaturas (só perfil pago):**
  - Loaders/UI de `perfil.$username` e `profile.$username`: quando `kind='free'`, esconder card de assinatura/preço, ocultar aba "Assinantes" e não chamar `activeSub`.
  - `subscribe.functions` / checkout: rejeitar tentativa contra `creator_profile_id` com `kind='free'` (guard server + UI escondida).
  - Dashboard: aba/seções "Assinantes", "Top assinantes", "Receita de assinatura" ocultas quando perfil ativo é free.
  - `/subscriptions` do assinante continua igual (lista o que já foi assinado, sempre em perfis pagos).

## Fase 5 — Escrita de configurações no `creator_profiles`
- `settings/myprofile` (nome, bio, avatar, cover), `settings/social-media`, `settings/chat-settings` → gravam na linha `creator_profiles` correspondente a `active_profile_id`.
- `settings/subscription` (preço + descontos) → **só habilitada** quando perfil ativo é `paid`; grava em `creator_profiles`.
- `criar-perfil-gratuito.tsx`: cria/atualiza `creator_profiles(kind='free')` (sem `price_monthly`) e aponta `profiles.active_profile_id`; para de gravar em `free_username/free_display_name/free_avatar_url`.

## Fase 6 — Aposentar campos legados
- Após migração das leituras: remover `profiles.free_username/free_display_name/free_avatar_url`.
- `profiles.username/avatar_url/cover_url/bio/price_monthly/discount_*/chat_welcome_*` viram somente-histórico; código passa a ler exclusivamente de `creator_profiles`.

## Detalhes técnicos
- Novo utilitário server `resolveActiveCreatorProfile(userId)`; `resolveCreatorIdentities` (já existe) continua para leituras em lote.
- Rotas: `dashboard`, `perfil.$username`, `profile.$username`, `publisher`, `follow`, `my-monetisex-stats`, `subscriptions`, `criar-perfil-gratuito`, `settings.*`.
- Backend: `monetization.functions`, `subscribe.functions`, `profile.functions`, `onboarding.functions`, `stats.functions`, `email-events.server`, `restrictions.functions`.
- Guards duplos (server + UI) para bloquear qualquer assinatura contra perfil free.
- Risco: colisão de `username` entre `profiles` e `creator_profiles` — a migration valida antes de aplicar `UNIQUE`.