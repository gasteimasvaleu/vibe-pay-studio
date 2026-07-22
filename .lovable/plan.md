# Monetização do chat — refactor em 5 partes

Meta: separar bem os três "cifrões" do chat + adicionar dois novos fluxos ausentes (convite formal de videochamada e solicitação inversa) + broadcast segmentado.

## 1) Composer com ícones separados

Manter o layout atual (Anexo, Câmera, Estrelinhas, $, Áudio, Enviar), mas re-mapear o $ e trocar a semântica:

- 📎 **Anexo** — como está.
- 📷 **Câmera** — como está.
- ✨ **Estrelinhas** (emojis flutuantes) — como está.
- 💲 **Preço da mídia (PPV)** — só habilita quando há pelo menos um anexo. Sem anexo, o botão fica desativado com tooltip "Anexe uma mídia para definir o preço". Se o criador remover todos os anexos, `priceCents` é resetado. Faixa R$ 0,50 – R$ 500 (já validada no `sendMessage`).
- 🎁 **Mimo** — novo botão só visível para **assinantes** (não-criador que já assina ou não). Abre um `TipDialog` reaproveitado. Cria `tips` via wallet ou `createTipPayment` (já existe) + insere uma mensagem-sistema no thread ("Você enviou um Mimo de R$ X") usando `metadata.tip = { amountCents, tipId }`. Faixa R$ 5 – R$ 2.000.
- 📹 **Convite de videochamada** — novo botão só visível para **criador**. Substitui o uso do dialog do header nesse fluxo (o botão do header segue existindo para "chamar agora"). Abre um `VideoCallInviteDialog` que pede preço (R$ 39,90 – R$ 5.000) e duração (5–120 min), cria um `video_calls` com `status='pending_payment'` + `expires_at = now()+10min`, e insere no chat uma mensagem com `metadata.callInvite = { callId, priceCents, durationMin, expiresAt }`.
- 🎤 **Áudio** e ➡️ **Enviar** — como está.

O assinante vê o **botão de Mimo** no lugar do botão de PPV (que é sempre do criador). Ordem no composer para assinante: 📎 📷 ✨ 🎁 🎤 ➡️. Para criador: 📎 📷 ✨ 💲 📹 🎤 ➡️.

## 2) Card-convite de videochamada dentro do chat

Renderização especial em `chat.$threadId.tsx`: quando `message.metadata.callInvite`, mostrar card com preço, duração, contador regressivo até `expiresAt`, e botão "Pagar e aceitar" (assinante) / "Cancelar convite" (criador).

- Pagamento reaproveita `createVideoCallPayment` + wallet (já existem).
- Ao pagar: dispara webhook Asaas → marca `video_calls.payment_status='paid'`, cria a sala Daily quando iniciada. Mensagem passa a mostrar "Convite aceito — entrar na chamada".
- Se `expires_at < now()` sem pagamento: card mostra "Convite expirado" e um trigger noturno (ou verificação client-side) marca `status='expired'`. Não estornar nada (não houve pagamento).
- Botão do header continua para "chamar agora" (o fluxo atual sem expiração).

**Mudança no schema:** adicionar `expires_at timestamptz` e o valor `pending_payment` ao enum `video_call_status` (verificar se já existe; se sim, apenas adicionar `expires_at`). Adicionar policies para o criador cancelar/inserir convite e assinante ver.

## 3) Solicitação inversa (assinante paga para enviar mídia)

Nova tabela `public.chat_media_requests`:

```
id, thread_id, requester_id (subscriber), creator_id,
price_cents, status ('pending_payment'|'paid'|'delivered'|'expired'|'cancelled'),
payment_intent_id, message_id (do card),
expires_at, media (jsonb, preenchido após pagar+enviar),
created_at, updated_at
```

+ RLS: leitura pelos dois lados do thread; escrita restrita por role. Faixa R$ 14,90 – R$ 2.000. Trigger que credita a carteira do criador quando `status='delivered'` (split padrão da plataforma).

Toggle no perfil do criador em `/settings/chat-settings` (nova seção): "Aceitar envio pago de mídia dos assinantes" + preço mínimo/máximo (defaults 14,90 e 2000). Guardar em `profiles.paid_dm_upload_enabled`, `paid_dm_upload_min_cents`, `paid_dm_upload_max_cents`.

No composer do assinante, se o criador da conversa tem essa opção ativa, aparece um mini-botão de texto "Enviar mídia paga (R$X)" ao clicar em 📎. Fluxo:
1. Assinante escolhe arquivo → sistema mostra o valor e pede confirmação de pagamento (Pix/cartão/carteira).
2. Ao pagar: `chat_media_requests` vai para `paid`, upload é liberado para o bucket `chat-paid-uploads/{requestId}/`.
3. Após upload concluído: `status='delivered'`, mensagem entra no chat como uma mídia comum enviada pelo assinante (metadata marca `paidUpload=true` para exibir badge "Mídia paga").

## 4) Mimo dentro do chat

Reaproveitar `TipDialog` (feed) genérico. No sucesso: inserir mensagem-sistema no thread com `metadata.tip`. Card específico com ícone de presente e valor. Sem mídia. Assinante vê o botão; criador vê tips recebidos como card destacado.

## 5) Broadcast segmentado (mensagem em massa)

Nova página `/settings/broadcast` (só criador):
- Textarea + anexo opcional + preço opcional (respeita a mesma regra: preço só com anexo).
- Filtro de público: `todos_seguidores`, `assinantes_ativos`, `assinantes_expirados`, `top_compradores` (top N por gasto).
- Server function `sendBroadcast` que:
  1. Resolve a lista de `user_id` a partir de `follows` / `subscriptions` / `transactions`.
  2. Para cada destinatário: chama `get_or_create_thread` + insere `chat_messages` (mesmo shape do PPV).
  3. Retorna `{ sent, skipped, failed }`.

Limitar a 500 destinatários por disparo e adicionar `broadcast_jobs` (tabela auditando: creator_id, audience, filter, total, sent, created_at) para não perder o histórico.

## Passos técnicos

1. **Migração SQL** (uma única):
   - `alter table video_calls add column expires_at timestamptz;`
   - `alter type video_call_status add value if not exists 'pending_payment';`
   - `alter type video_call_status add value if not exists 'expired';`
   - `alter table profiles add column paid_dm_upload_enabled boolean not null default false, add column paid_dm_upload_min_cents int not null default 1490, add column paid_dm_upload_max_cents int not null default 200000;`
   - `create table public.chat_media_requests (…)` + GRANTs + RLS + trigger split.
   - `create table public.broadcast_jobs (…)` + GRANTs + RLS (criador vê os seus).
   - Novo bucket `chat-paid-uploads` (private) com policy: `insert` só pelo `requester_id` do request `paid`; `select` só pelos dois usuários do thread.

2. **Server functions** (em `src/lib/`):
   - `chat.functions.ts`: `createCallInvite`, `cancelCallInvite`, `expireStaleInvites` (chamada no listThreads/getThread).
   - `paid-dm.functions.ts` (novo): `createMediaRequest`, `payMediaRequest`, `completeMediaRequest`.
   - `broadcast.functions.ts` (novo): `previewAudience`, `sendBroadcast`.
   - Ajustar `sendMessage`: recusar `priceCents>0` sem `media` (regra "só cobra com mídia").

3. **Componentes React**:
   - `ChatComposer.tsx`: reorganizar ícones por papel (creator/subscriber), desabilitar `$` sem mídia, resetar preço ao limpar mídia, adicionar Mimo e Convite de vídeo.
   - `VideoCallInviteDialog.tsx` novo.
   - `PaidMediaRequestDialog.tsx` novo (fluxo em 3 passos: preço → pagar → upload).
   - `chat.$threadId.tsx`: renderers especiais para `metadata.callInvite`, `metadata.tip`, `metadata.paidUpload`. Countdown ticker (setInterval) para convites com `expires_at`.
   - `settings.chat-settings.tsx`: nova seção "Envio pago de mídia" (toggle + preço mínimo/máximo).
   - `settings.broadcast.tsx` novo + link no menu de settings do criador.

4. **Handlers de pagamento**: estender webhook Asaas para marcar `chat_media_requests.status='paid'` e `video_calls.status='pending_payment'→'confirmed'` quando o `payment_intent` referência-los. Reusa a lógica existente do webhook.

## Fora do escopo desta rodada

- Anti-spam do broadcast (rate-limit por dia) — anotado para depois.
- Templates salvos de broadcast.
- Chamada agendada (com data futura) — hoje o convite é para "aceitar em 10min".
