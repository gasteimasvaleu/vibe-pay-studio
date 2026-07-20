## Contexto

Hoje, quando um creator pago está no modo `free` (`active_view = 'free'`), o dashboard renderiza `SubscriberDashboard` e a `BottomNav` esconde o botão central "Postar". Isso está errado: o perfil gratuito **é um perfil de criador que monetiza** (posta, cobra chat, PPV, mimo, live) — ele só não tem mensalidade de assinatura.

Além disso, o schema atual trata `profiles` como 1:1 por `user_id`, então "publicações", "transações", "assinantes" e "saldo" são todos do usuário — não do perfil ativo. Isso impede que "Meu Monetisexy" e extrato mostrem dados escopados por perfil.

Este plano tem duas fases independentes: **Fase 1** entrega o ajuste imediato de UX sem tocar em schema. **Fase 2** faz a refatoração 1:N e escopamento por perfil.

---

## Fase 1 — UX imediata do dashboard/navbar no modo free vinculado

### 1.1 Renderizar `CreatorDashboard` no modo free vinculado
**`src/routes/_authenticated/dashboard.tsx`**
- Remover o branch que retorna `<SubscriberDashboard linkedCreatorMode />` para creator pago em modo free.
- Passar a renderizar `<CreatorDashboard variant="linked_free" ... />` nesse caso, com `switchAvatarUrl={creatorAvatarUrl}` (destino da troca = perfil creator pago).

### 1.2 `CreatorDashboard` suportar "linked_free"
**`src/components/dashboard/CreatorDashboard.tsx`**
- Aceitar `variant: "creator" | "free_creator" | "linked_free"`.
- Em `linked_free`:
  - Switch bar: **"Voltar ao perfil creator"** → chama `setActiveProfileView({ view: "creator" })` e navega para `/dashboard`.
  - Esconder cards de perfil pago: **Assinatura** (settings), **Meus assinantes** (`/follow`) e **Ofertas** (`/promotions`).
  - Manter Meu Perfil, Meu Monetisexy, Chat, Meu Banco, Em Alta, Carteira, Acervo, Live, Reportar bug, Vazamento, e o grupo "Outras Funcionalidades".
  - `EarningsSummary` fica (ganhos de chat/PPV/mimo existem no modo gratuito).
- Em `free_creator` puro (conta nasceu gratuita, sem creator pago vinculado): sem switch bar; mesmos cards do `linked_free`.

### 1.3 `BottomNav` mostrar layout de creator no modo free
**`src/components/site/BottomNav.tsx`**
- Trocar `isSubscriber = accountType === "subscriber" || inFreeMode` por `isCreator = accountType !== "subscriber"`.
- `creator`, `free_creator` e creator pago em modo free passam todos a ter o botão central **Postar** e grid de 5 colunas. Só `subscriber` puro fica com o layout de 4 colunas.

### 1.4 Limpeza
- Remover a prop `linkedCreatorMode` de `SubscriberDashboard` e o branch de switch bar que só existia para o modo vinculado.

**Resultado da Fase 1:** dashboard e navbar corretos no modo free vinculado, sem tocar em schema, RLS ou dados. Os totais ainda são globais por usuário — isso é o que a Fase 2 resolve.

---

## Fase 2 — Escopamento por perfil (schema 1:N)

Refatoração grande. Não bloqueia a Fase 1 e deve ser feita em migrações incrementais com backfill.

### 2.1 Modelagem
- Nova tabela `public.creator_profiles`:
  - `id uuid pk`, `user_id uuid → auth.users`, `kind text check ('paid'|'free')`, `username text unique`, `display_name`, `avatar_url`, `cover_url`, `bio`, `price_monthly numeric null` (null = gratuito), `discount_quarterly`, `discount_semiannual`, `kyc_status`, timestamps.
  - Unique `(user_id, kind)` → no máximo 1 perfil pago e 1 gratuito por conta (o mesmo modelo do briefing).
  - `active_profile_id uuid` em `profiles` (substitui `active_view` textual).
- Migrar as colunas hoje espalhadas em `profiles` que descrevem o perfil pago (`username`, `avatar_url`, `cover_url`, `bio`, `price_monthly`, `discount_*`, `kyc_status`, `chat_welcome_*`) para `creator_profiles(kind='paid')`.
- Migrar `free_username`, `free_display_name`, `free_avatar_url` (e cover/bio análogos, se existirem) para `creator_profiles(kind='free')`.
- Manter `profiles` como "conta do usuário" (email prefs, banned_at, roles indiretas, ajustes globais).

### 2.2 Chaves em tabelas de conteúdo/financeiro
Adicionar `creator_profile_id uuid` (não-nulo depois do backfill) e índice em:
- Conteúdo/engajamento: `publications`, `publication_media`, `publication_unlocks`, `publication_bookmarks`, `publication_comments`, `publication_likes`, `publication_views`, `publication_comment_likes`, `publication_challenge_tiers`.
- Chat/lives: `chat_threads` (revisar par `user_a/user_b` para virar `profile_a/profile_b`), `chat_messages`, `chat_message_unlocks`, `live_sessions`, `live_likes`, `live_comments`.
- Comercial: `subscriptions` (creator_profile_id só faz sentido em `paid`), `tips`, `promotions`, `video_calls`, `subscriber_restrictions`, `follows`.
- Financeiro: `transactions` (novo `creator_profile_id` + manter `creator_id` para auditoria), `creator_wallets` (passar chave para `creator_profile_id`), `creator_streak_days`, `withdrawals`, `payout_accounts` (definir se é por conta ou por perfil — recomendo por conta), `saved_cards` e `subscriber_wallets` continuam no `user_id` (assinante é a conta).

### 2.3 Backfill
- Para cada `profiles` existente:
  - Criar `creator_profiles(kind='paid')` copiando os campos do perfil pago (obrigatório para `creator`/`free_creator`? não — free_creator vira só um perfil `kind='free'`).
  - Se `free_profile_enabled`, criar também `creator_profiles(kind='free')` com os campos free_*.
  - `profiles.active_profile_id` = id do perfil correspondente ao `active_view`.
- Para cada tabela da lista 2.2, preencher `creator_profile_id` a partir do `user_id` do dono (todos os registros existentes pertencem ao perfil `paid`, exceto conteúdo criado pós-lançamento em `active_view='free'`, que hoje não é distinguível — assumir `paid` para tudo pré-migração).
- Só depois do backfill: `ALTER COLUMN creator_profile_id SET NOT NULL` e criar FKs.

### 2.4 RLS, funções e triggers
Reescrever para escopar por `creator_profile_id`:
- `can_see_publication`, `is_restricted`, `has_role` (roles continuam por `user_id`).
- Triggers de wallet (`transactions_apply_wallet_effects`, `release_matured_earnings`, `bump_streak_on_*`) passam a atualizar `creator_wallets` pelo `creator_profile_id`.
- `pay_with_wallet`: aceitar `creator_profile_id` no lugar de `_creator_id`; resolver comprador continua por `user_id` (a carteira do assinante é global à conta).
- `get_or_create_thread` / `send_welcome_message_on_subscription`: par de perfis, não par de users.
- `subscriptions_sync_transaction` / `tips_sync_transaction` / `chat_message_unlocks_sync_transaction` / `video_calls_sync_transaction` / `publication_unlocks_sync_transaction`: gravar `creator_profile_id` na transaction.
- Admin RPCs (`admin_financial_summary`, `admin_daily_revenue`, `admin_wallets_snapshot`) continuam agregando por conta, mas ganham variantes por perfil se o admin precisar.

### 2.5 App (frontend + server functions)
- `dashboard.tsx` beforeLoad: resolver `activeProfile` (via `active_profile_id`) e passar `activeProfileId` no contexto.
- Todas as `*.functions.ts` que hoje filtram por `context.userId` como criador passam a filtrar por `activeProfileId`:
  - `publications.functions.ts`, `stats.functions.ts` (Meu Monetisexy), `finance.functions.ts` (extrato/carteira criador), `promotions.functions.ts`, `chat.functions.ts` (do lado do criador), `restrictions.functions.ts`, `monetization.functions.ts`, `wallet-pay.functions.ts`, `payouts.functions.ts` (se ficar por perfil), `vault.functions.ts`, `collections.functions.ts` (do lado assinante continua por user_id).
- Server function nova `setActiveProfile({ profileId })` substitui `setActiveProfileView`.
- Rotas públicas:
  - `/profile/:username` resolve `creator_profiles.username`.
  - Remover o hack atual de resolver por `profiles.free_username`.
- Publisher (`/publisher`): grava `creator_profile_id` = perfil ativo.
- Onboarding gratuito (`/criar-perfil-gratuito`): cria `creator_profiles(kind='free')` para o `user_id`; para conta free-only, marca esse perfil como ativo.
- `BottomNav`, `TopNav`, `CreatorDashboard`, `SubscriberDashboard`: consumir `activeProfile` (nome/avatar/kind) em vez das colunas duplicadas em `profiles`.

### 2.6 Admin
- Dashboard admin ganha, onde relevante, filtro "por perfil" além de "por usuário" (transações, saques, moderação continuam por usuário; relatórios financeiros podem detalhar por perfil).

### 2.7 Rollout
Ordem sugerida das migrações (cada uma é aprovada separadamente):
1. Criar `creator_profiles` + coluna `active_profile_id` em `profiles`. Backfill.
2. Adicionar `creator_profile_id` nullable em cada tabela do 2.2 + backfill + índices. NOT NULL + FK como passo final.
3. Reescrever funções/triggers/RLS para usar `creator_profile_id`.
4. Migrar server functions do app (feature flag opcional para rollback).
5. Depreciar colunas legadas em `profiles` (`free_username`, `free_display_name`, `free_avatar_url`, `active_view`, `free_profile_enabled`) — remover só depois que o app inteiro estiver migrado.

Duração realista: alguns dias de trabalho de banco/backfill + refactor amplo em `src/lib/*.functions.ts`. Risco alto em RLS — cada tabela precisa de revisão individual. Recomendo travar deploys de features novas de creator enquanto a Fase 2 estiver em andamento.

---

## Resumo

- **Fase 1** (barato, direto): dashboard/navbar do creator no modo free vinculado, sem tocar em schema.
- **Fase 2** (caro, alto valor): `creator_profiles` 1:N, escopamento por perfil em conteúdo/finanças, `active_profile_id`, migrações incrementais + backfill + reescrita de RLS/funções/triggers/server functions.

Posso começar pela Fase 1 e, quando ela estiver mergeada, abrir a primeira migração da Fase 2 (criar `creator_profiles` + backfill) como próximo passo — cada migração da Fase 2 vai precisar de aprovação sua individualmente por causa do impacto.
