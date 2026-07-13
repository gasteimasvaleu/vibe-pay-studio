
# Backend da plataforma de assinaturas — plano em fases

Escopo enorme. Vou entregar em fases pequenas e revisáveis, começando pelo schema + regras de acesso (fundação) e evoluindo módulo a módulo. Cada fase é uma migration + server functions + wiring mínimo no frontend existente.

## Estado atual (já existe)

- `profiles` (com `account_type`, `kyc_status`, `veriff_session_id`, `price_monthly`, `discount_quarterly/semiannual`, redes sociais, `onboarding_completed_at`)
- `publications` + `publication_media` + `publication_unlocks` (compra avulsa de post, com `price_cents`, `challenge_cents`, `expires_at`, `scheduled_at`, `visibility`)
- `promotions` (planos promocionais de assinatura)
- `chat_threads` + `chat_messages` (texto simples, sem mídia paga ainda)
- `user_roles` + `has_role()` (papel admin)
- Storage bucket `criativos` (público)
- Veriff (KYC) já integrado via `onboarding.functions.ts`
- Frontend TanStack Start com rotas `_authenticated/*` já mapeadas para dashboard, mywallet, chat, publisher, promotion, banco, colecoes, follow, feed, em-alta, subscriptions, vault, settings/*

## O que falta (mapeado contra o prompt)

Grandes lacunas:
1. **Financeiro / carteira**: `transacoes`, `wallet_assinante`, `carteira_saldo` (criador, com split nacional/internacional), `saques`, split 80/20 persistido, garantia de 60 dias em compras.
2. **Assinaturas** (`assinaturas`): não existe tabela — só há `promotions`. Precisa ciclo mensal/trimestral/semestral, renovação automática, cancelamento.
3. **Mimo/gorjeta** (`mimos`) em posts.
4. **Chat pago**: extensão de `chat_messages` para `type` (texto/áudio/mídia paga) + preço + unlock por mensagem, mensagem de boas-vindas, broadcast, agendamento.
5. **Chamada de vídeo 1:1** (`chamadas_video`) com convite/expiração/pagamento — sem integrar provedor ainda (stub).
6. **Lives** (`lives`, `ingressos_live`) — schema + regras.
7. **Desafios** (`desafios`, `contribuicoes_desafio`) — coluna `challenge_cents` já existe em `publications`, falta orquestração.
8. **Acervo (media library)**: soltar `publication_media` para permitir mídia sem post (`publication_id` nullable) + tabela `media_assets` de referência canônica.
9. **Post temporário**: coluna `expires_at` já existe — falta filtro/enforcement e job de expiração lógica.
10. **Rankings** (`rankings_snapshot`) + jobs (`pg_cron` chamando server routes em `/api/public/hooks/*`).
11. **Indicações** (`indicacoes`) e **Afiliados** (`afiliados`, `afiliado_vendas`).
12. **KYC documentos** (`kyc_documentos`) — hoje só há campos soltos em `profiles`; formalizar histórico e fila manual.
13. **CNPJ / Agências**: `contas_cnpj`, `agencias`, links com `profiles`.
14. **Denúncias / moderação** (`denuncias`) + fila de aprovação do Mural.
15. **Auditoria** (`audit_log`) para ações financeiras/KYC/2FA/papel.
16. **Antifraude self-purchase**: constraint impedindo comprador = criador em unlocks/tips/subs.
17. **2FA TOTP** (secret + backup codes).
18. **Bloqueio de login após 4 tentativas** (`login_attempts`).
19. **Programa de bônus de recarga** (`wallet_bonus_campaigns`, `wallet_topups`).
20. **RLS extensivo** em cada tabela nova + grants explícitos.
21. **Gateway de pagamento (Asaas/Pagar.me/Iugu)**: fora desta rodada, conforme pedido — vou deixar `provider` + `provider_ref` + status nas transações, com um adaptador stub que apenas registra `pending`/`paid` manual até integrarmos.
22. **Provedores de vídeo/live**: idem, stub de sala com `room_id`/`join_url` nulos.

## Ordem de execução (uma fase = uma migration + código correspondente)

### Fase 1 — Fundação financeira (esta rodada)
Migration única com:
- `wallets` (criador: liberado, a_liberar_nacional, a_liberar_internacional; assinante: `wallet_subscriber` separado).
- `transactions` (unificada, `kind` enum: subscription, publication_unlock, chat_unlock, tip, video_call, live_ticket, challenge_contribution, wallet_topup, wallet_bonus, referral_credit, affiliate_credit, withdrawal, refund).
  - Campos: `buyer_id`, `creator_id`, `amount_cents_gross`, `platform_fee_cents`, `net_cents`, `commission_pct_applied`, `payment_method`, `country_code`, `status`, `provider`, `provider_ref`, `released_at`, `access_until` (garantia 60 dias).
- `withdrawals` (saques Pix, taxa extra, primeiro-saque flag).
- `payment_intents` (idempotência de webhook: `provider`, `event_id UNIQUE`, `payload`, `processed_at`).
- Função `apply_transaction_split(gross, kind)` que devolve fee/net e regista o split de forma imutável.
- Trigger: `INSERT INTO transactions status='paid'` credita `wallets` conforme `payment_method`/`country_code` (Pix imediato, cartão D+15 via `released_at`).
- RLS: criador vê próprias transações; comprador vê próprias; admin vê tudo (`has_role`).
- Grants explícitos em cada tabela nova.

Sem alteração de código de frontend nesta fase — apenas as fundações; server functions de leitura (`getCreatorEarnings`, `getWalletBalance`) e stub `createManualTransaction` (admin) para poder testar o dashboard.

### Fase 2 — Assinaturas + Mimo + unlock de posts real
- `subscriptions` (assinante x criador, plano, `current_period_end`, `auto_renew`, `status`).
- `tips` (mimo em post).
- Migrar `publication_unlocks` para escrever também em `transactions` (via trigger) e respeitar `access_until = now() + 60d`.
- Constraint `buyer_id <> creator_id`.
- Server functions: `subscribeToCreator`, `cancelSubscription`, `tipCreator`, `unlockPublication` (todas ainda em modo "manual pagamento", marcando como pending até PSP existir).

### Fase 3 — Chat pago + chamada de vídeo (stubs de provedor)
- Estender `chat_messages` com `kind`, `price_cents`, `media_asset_id`, `unlock_transaction_id`.
- `chat_unlocks`. `chat_broadcasts`, `chat_scheduled_messages`, `chat_welcome_configs`.
- `video_calls` (convite, expiração 10 min, duração 5–120 min, preço 39.90–5000). Sem provedor real ainda.

### Fase 4 — Lives, Desafios, Acervo, Post temporário
- `lives`, `live_tickets` (venda só quando `status='live'`, teto 60 min/dia).
- `challenges` + `challenge_contributions` (usar `challenge_cents` de `publications`).
- `media_assets` canônico + `publication_media.media_asset_id` FK; permitir mídia sem post.
- Enforce `expires_at` de post temporário no filtro do feed.

### Fase 5 — Comunidade e compliance
- `kyc_documents` (histórico, fila manual, aprovador).
- `reports` (denúncias) + `mural_review_queue`.
- `audit_log` (INSERT-only, RLS admin-only).
- `login_attempts` + bloqueio após 4 falhas.
- `totp_secrets` + `backup_codes` (2FA).
- `cnpj_accounts`, `agencies`, `agency_memberships`.

### Fase 6 — Growth
- `referrals` (5% por 6 meses, job mensal).
- `affiliates` + `affiliate_sales` (split extra no PSP no futuro).
- `wallet_bonus_campaigns` + `wallet_topups`.

### Fase 7 — Rankings + jobs
- `rankings_snapshots` + server routes `/api/public/hooks/rank-*` chamadas por `pg_cron` (Top Creators de hora em hora; demais diários).

### Fase 8 — Integração real de gateway (fora desta rodada)
Quando você escolher o PSP: subconta no aprovar-KYC, split embutido, webhook assinado idempotente sobre `payment_intents`, saque via API. Provedor de vídeo/live: mesmo padrão de adapter.

## Detalhes técnicos (para o dev)

- Todas as tabelas em `public` seguirão o padrão obrigatório: `CREATE TABLE` → `GRANT` (`authenticated` + `service_role`; `anon` só em leituras públicas explícitas) → `ENABLE RLS` → `CREATE POLICY`.
- Papel admin via `has_role(auth.uid(),'admin')` — já existe.
- Split imutável: gravar `commission_pct_applied` e `platform_fee_cents` na própria linha, nunca recalcular.
- Idempotência: `payment_intents.event_id UNIQUE` + upsert `ON CONFLICT DO NOTHING`.
- Server functions em `src/lib/*.functions.ts` (auth com `requireSupabaseAuth`), admin em `.server.ts` importado dentro do handler.
- Frontend só é tocado quando o backend correspondente estiver pronto — telas hoje mostram valores mockados (`R$ -`) e vão passar a ler dos server functions.

## Confirmação necessária antes de começar

Confirme:
1. **Começo pela Fase 1** (fundação financeira: `wallets`, `transactions`, `withdrawals`, `payment_intents` + RLS + grants), sem tocar em UI ainda. OK?
2. Comissão da plataforma: o prompt cita **20%** no §0 e **15%/75%** no §14. Vou fixar em **20% / 80%** (o §14 parece erro de digitação). Confirma?
3. **Sem integração de PSP/vídeo/live** agora — deixamos `provider='manual'`, `status='pending'` até plugar Asaas/Twilio/Mux. OK?

Assim que você confirmar, entro em build mode e mando a migration da Fase 1.
