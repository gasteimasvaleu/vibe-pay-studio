
# Isolar todos os dados do dashboard por perfil ativo (paid ↔ free vinculado)

Hoje várias telas somam paid + free porque leem tudo por `creator_id = auth.user.id`. As tabelas já têm a coluna `creator_profile_id` (preenchida por triggers em novos registros), então a maior parte do trabalho é: (a) atualizar as leituras/gravações para filtrar por `active_profile_id`, (b) adicionar essa coluna nas poucas tabelas onde falta, (c) backfill do histórico atribuindo ao perfil pago.

## O que muda por área

### 1. Meu Banco (`/banco`)
Cada persona passa a ter carteira, ganhos, saques e extrato próprios.

- Adicionar `creator_profile_id` em `creator_wallets` e `withdrawals` (não existe); tornar a chave lógica `(user_id, creator_profile_id)` em `creator_wallets`.
- Atualizar triggers `transactions_apply_wallet_effects` e `release_matured_earnings` para creditar/debitar a carteira do `creator_profile_id` da transação (não mais 1 carteira por user).
- `finance.functions.ts`: `getCreatorWallet`, `getCreatorBancoOverview`, `getCreatorEarningsSummary`, `listCreatorTransactions`, `listCreatorWithdrawals`, `requestWithdrawal` → resolver o `active_profile_id` via `getProfileAndActiveCreator` e filtrar por `creator_profile_id`.
- `payout_accounts`: adicionar `creator_profile_id` (opcional; se null vale para todos) para permitir contas bancárias distintas depois.

### 2. Meu Monetisexy (`/my-monetisex-stats`)
Todas as métricas passam a refletir só o persona ativo.

- `stats.functions.ts`: refatorar as ~15 funções (`getEarningsSeries`, `getEarningsByProduct`, `getPeriodTotals`, `getResumoStats`, `getRecordes`, `listExtrato`, `getAssinantesStats`, `getTopAssinantes`, `getAssinantesList`, `getTopPaises`, `getStreak`, `getAlcance`, `getEngajamentoPublicacoes`, `getEngajamentoLives`) para filtrar por `creator_profile_id = active.id` em `transactions`, `subscriptions`, `publications`, `publication_views`, `profile_views`, `live_sessions`, `creator_streak_days` etc.

### 3. Ofertas (`/promotions`)
- `promotions.functions.ts` + duplicata em `payouts.functions.ts`: gravar e listar por `creator_profile_id` ativo.
- Ajustar `pay_with_wallet` para casar a promoção pelo `creator_profile_id` da assinatura, não só pelo `creator_id`.

### 4. Acervo (`/vault`)
- Adicionar `creator_profile_id` em `vault_uploads`, `vault_categories`, `vault_category_items` (via `vault_uploads.creator_profile_id`).
- `vault.functions.ts`: gravar novos uploads/categorias com o profile ativo; listagens e contagens filtram por ele.
- Publisher: ao anexar item do Vault, restringir a picker do perfil ativo.

### 5. Agendados (`/publicacoes-agendadas`)
- `publications.functions.ts`: `getScheduledPublications`, `reschedulePublication`, `publishScheduledNow`, `assertPublicationOwner` (para o caso agendado) → filtrar por `creator_profile_id = active.id` (mantendo `author_id = user` como guard extra).

### 6. Chat, Paid DM e Videochamadas
Separar identidade de chat por persona (assinantes verão inbox distintas quando conversam com paid vs free).

- Adicionar `creator_profile_id`/`user_a_profile_id`/`user_b_profile_id` em `chat_threads` e propagar em `chat_messages` (mensagem herda do thread).
- Substituir `get_or_create_thread(other_user)` por `get_or_create_thread(other_user, other_profile_id)`. A chave única passa a ser `(user_a, user_a_profile_id, user_b, user_b_profile_id)`.
- Atualizar `chat.functions.ts` (`listThreads`, `getOrCreateThread`, `sendMessage`, contadores de não-lido), `chat-monetization.functions.ts` (Paid DM), `broadcasts.functions.ts` (audiência), `video-calls.server.ts` e `chat_media_requests` para carregar/gravar o `creator_profile_id` ativo do lado que envia.
- Trigger `send_welcome_message_on_subscription` passa a criar thread já pareada ao `creator_profile_id` da subscription.
- Ao trocar de persona no dashboard, o inbox recarrega para mostrar só os threads daquele persona.

### 7. Backfill histórico
Migração única, atribuindo todo histórico ao perfil `paid` (persona antiga):
- `creator_wallets`, `withdrawals`, `promotions`, `vault_*`, `chat_threads`, `chat_messages`, `chat_media_requests`, `video_calls`, `broadcast_jobs`, `payout_accounts` → `creator_profile_id := default_paid_profile(creator_id)` quando nulo.
- Após backfill, tornar `creator_profile_id` `NOT NULL` nas tabelas onde faz sentido (novos inserts já garantem via trigger).

## Estratégia técnica

- Um helper compartilhado `getActiveProfileIdFor(supabase, userId)` (em `profile-active.server.ts`) usado por todas as functions afetadas, para evitar reimplementar a resolução `active_profile_id → paid → primeiro`.
- Migrações em duas etapas: (1) add colunas + triggers de preenchimento + backfill; (2) ajustar RLS e adicionar `NOT NULL` onde couber. Fica cirúrgico e reversível.
- RLS de leitura das novas colunas continua baseada em `auth.uid() = user_id` do dono do `creator_profile`, mais checagens de audiência (assinante, comprador) que já existem.
- Rota `/dashboard` já invalida queries via `router.invalidate()` na troca de perfil; adicionar `queryClient.invalidateQueries()` nas telas afetadas para garantir re-fetch imediato.

## O que fica de fora

- Feed, Colecoes, Assinaturas e Carteira do assinante permanecem user-level (compras/consumo do fã).
- Em Alta continua mock até virar produção.
- `payout_accounts` fica multi-profile-ready mas segue permitindo uma conta única compartilhada (decisão futura).

## Ordem de implementação

1. Migração 1: colunas + triggers de preenchimento em `creator_wallets`, `withdrawals`, `vault_*`, `chat_threads`, `chat_messages`, `payout_accounts`, `chat_media_requests`, `broadcast_jobs`.
2. Migração 2: backfill de histórico → `default_paid_profile`.
3. Migração 3: RPC `get_or_create_thread(other_user, other_profile_id)` + ajustes de `pay_with_wallet`/`send_welcome_message_on_subscription`.
4. Refatoração das server functions listadas (finance, stats, promotions, vault, publications, chat, chat-monetization, video-calls, broadcasts).
5. Ajustes de UI para invalidar queries e recarregar inbox ao trocar de perfil.
6. Smoke test manual: logar como paid, publicar/venda/tip; alternar para free, publicar/venda/tip; verificar isolamento em Banco, Stats, Ofertas, Acervo, Agendados, Chat.
