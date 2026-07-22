## Estado atual (verificado)

`/chat-agendamento` é 100% cosmética hoje:

- **Calendário** não consulta o banco; painel direito é placeholder fixo.
- **Composer** — chips são `Set<string>` local, "Pesquisar" não faz nada, "Aplicar filtro" não faz nada, envio só mostra `toast` (não chama `sendBroadcast`), `scheduledAt` nunca vai ao servidor.
- **Backend** — `sendBroadcast` existe (envia imediatamente) mas `broadcast_jobs` não tem `scheduled_at`, nem status `scheduled`, nem dispatcher. Sem cobertura para `follows.follower_id` (Seguindo), `expira em 7 dias`, `interações` ou upload de mídia em massa.

## Escopo

Tornar os dois estados totalmente funcionais **incluindo** upload real de mídia e os chips extras.

---

## 1. Migração

Alterar `public.broadcast_jobs`:
- `ADD COLUMN scheduled_at TIMESTAMPTZ NULL`.
- Estender check de `status` para `('scheduled','running','completed','failed','cancelled')`.
- Índice parcial `(scheduled_at) WHERE status='scheduled'` para o dispatcher.
- Nova policy DELETE ao dono (para poder cancelar).

Bucket de storage `broadcast-uploads` (privado):
- Policies: `INSERT` pelo criador dono do path `${auth.uid()}/…`; `SELECT` só destinatários com unlock — reaproveitar o mesmo padrão de `chat_message_unlocks` já usado no chat pago.

## 2. Server functions (`src/lib/chat-monetization.functions.ts`)

Estender `previewBroadcastAudience` e `sendBroadcast` para cobrir novas audiências:

- `all_following` → `follows` onde `follower_id = userId` (contas que o criador segue).
- `expiring_7d` → `subscriptions` `status='active'` com `current_period_end BETWEEN now() AND now()+7d`.
- `recent_interactors` → distinct `user_id` de `publication_likes`, `publication_comments`, `chat_messages` e `tips` dirigidos ao criador nos últimos 30 dias (unificado, cap 500).

Novas server functions:
- `getBroadcastUploadUrl({ filename, mime })` — valida MIME (image/video/audio), gera path `${userId}/${uuid}/${sanitized}` em `broadcast-uploads`, devolve `signedUploadUrl` + `path` (`createSignedUploadUrl`).
- `scheduleBroadcast` — mesma validação de `sendBroadcast` + `scheduledAt` obrigatório futuro. Persiste `status='scheduled'`, pré-calcula `total_recipients` (mas não envia).
- `listScheduledBroadcastsByMonth({ year, month })` — jobs do criador logado (`status IN ('scheduled','running')`) para marcar dias no calendário.
- `listScheduledBroadcastsByDay({ date })` — jobs do dia, retornando `scheduled_at`, `audience`, `total_recipients`, preview do texto, `price_cents`, mídia (count/thumb).
- `cancelScheduledBroadcast({ id })` — `UPDATE status='cancelled'` (dono, `status='scheduled'`).
- `dispatchDueBroadcasts` (privada, usada só pelo hook público) — pega jobs vencidos, marca `running`, executa a mesma lógica de envio de `sendBroadcast` (agora com mídia) e finaliza `completed`/`failed`.

O envio (imediato e agendado) passa a inserir mensagens com `metadata.media = [...]` para cada destinatário; quando `price_cents > 0`, cria `chat_message_unlocks` pending por destinatário para desbloquear no pagamento (mesmo padrão do chat pago).

## 3. Frontend do composer (`chat-agendamento.tsx`)

Chips agora funcionais e mapeados 1:1 para o backend, comportando-se como **radio** (apenas 1 selecionado por vez):
- `Todos os seguidores` → `all_followers`
- `Seguindo` → `all_following`
- `Assinantes ativos` → `active_subscribers`
- `Expirados` → `expired_subscribers`
- `Expiram em 7 dias` → `expiring_7d`
- `Interações (30d)` → `recent_interactors`
- `Top 100 Compradores` → `top_buyers` (topN=100)
- `Top 1000 Compradores` → `top_buyers` (topN=1000)

Comportamento:
- Input "Pesquisar" filtra visualmente a lista de chips.
- "Aplicar filtro" chama `previewBroadcastAudience` e exibe a contagem real ("312 destinatários"); só depois habilita o envio.
- `ChatComposer`:
  - Upload real via ícones já existentes (anexo/câmera/galeria) → chama `getBroadcastUploadUrl`, faz upload direto ao Storage, adiciona ao array `media` do composer.
  - `PriceDialog` continua condicionado à existência de mídia (regra do backend).
  - `scheduledAt` no futuro → `scheduleBroadcast` + toast + volta ao calendário no dia agendado.
  - Sem `scheduledAt` → `sendBroadcast` + toast com `sent/failed`.

## 4. Frontend do calendário

- `useQuery(listScheduledBroadcastsByMonth, [year, month])` → renderiza um ponto/contador nos dias com jobs.
- `useQuery(listScheduledBroadcastsByDay, [date])` → substitui o placeholder por lista de cards (horário, audiência, preview de texto, badge de preço/mídia). Menu "…" com "Cancelar agendamento" → `cancelScheduledBroadcast` + invalidate das duas queries.
- Botão "+" continua abrindo o composer com o dia pré-selecionado.

## 5. Dispatcher

- Nova rota pública `src/routes/api/public/hooks/dispatch-scheduled-broadcasts.ts` (POST) — valida header `apikey` contra `SUPABASE_PUBLISHABLE_KEY`, importa `supabaseAdmin` dentro do handler e chama a lógica de `dispatchDueBroadcasts` (jobs vencidos, cap por execução).
- `pg_cron` + `pg_net` a cada 1 min chamando essa rota via URL estável `project--ccce3d77-…-lovable.app` (usando `supabase--insert` conforme card `schedule-jobs-modern`).

## 6. Verificação

- Agendar broadcast texto+preço+mídia para +2 min → aparece no calendário, some após dispatch, destinatários recebem mensagem com mídia bloqueada até pagar.
- Cancelar antes do horário → sumiu do calendário, dispatcher não envia.
- Envio imediato continua funcionando (`sendBroadcast`) para todas as novas audiências.

---

Vou começar pela migração; depois de aprovada, sigo com o Storage bucket, server functions, wiring do composer, calendário funcional e o dispatcher.