
## Objetivo

Adicionar transmissão ao vivo paga usando Cloudflare Stream Live (input WebRTC/WHIP no navegador, output HLS para viewers). Cada creator pode iniciar uma live definindo título, capa e preço; cada viewer paga uma vez para entrar. Enquanto o creator está ao vivo, aparece uma badge verde **LIVE** sobre o avatar dele em qualquer lugar do app, e um botão de largura total surge no card do perfil (abaixo da contagem de amigos, mesma largura do "Editar perfil") permitindo entrar na live.

## Como o Cloudflare Stream Live entra

- Criamos um **Live Input** por live no Cloudflare (API `/accounts/:id/stream/live_inputs`) já configurado para **WebRTC (WHIP/WHEP)**.
- O creator transmite direto do navegador via `POST {webRTCUrl}` (WHIP) usando `getUserMedia` + `RTCPeerConnection`, sem OBS.
- Os viewers assistem via **WHEP** (baixa latência) ou fallback HLS a partir do playback ID retornado pelo Live Input.
- Ao encerrar, marcamos a `live_sessions` como finalizada e opcionalmente deletamos o Live Input.

## Banco de dados (migração)

Reaproveitar `live_sessions` existente e estender:
- Adicionar colunas: `status text` ('scheduled'|'live'|'ended'), `price_cents integer`, `cf_live_input_id text`, `cf_webrtc_url text` (server-only via server fn), `cf_webrtc_play_url text`, `cf_playback_hls text`, `description text`.
- Nova tabela `public.live_tickets` (id, live_id, buyer_id, creator_id, creator_profile_id, amount_cents, transaction_id, provider, provider_ref, status, created_at) com GRANTs e RLS: viewer vê o próprio; creator vê tickets da própria live.
- Nova função `has_live_access(_live_id uuid, _user uuid)` (security definer): true se creator dono, se admin, ou se existe `live_tickets.status='paid'`.
- Realtime habilitado para `live_sessions`, `live_comments`, `live_likes`, `live_tickets`.
- RLS de `live_sessions`: SELECT público em campos básicos (para badge/discovery); campos sensíveis (WHIP URL) só via server fn autenticada como dono.
- Estender enum `transaction_kind` já contém `live_ticket` — usar direto.
- Trigger `live_tickets_sync_transaction()` espelhando o padrão de `story_unlocks_sync_transaction`.
- Estender `pay_with_wallet` com um novo kind `'live_ticket'` para permitir compra por saldo.

## Backend (server functions)

Arquivo novo `src/lib/lives.functions.ts`:
- `createLive({ title, description, priceCents, coverUrl })` — cria Live Input na Cloudflare via API, insere `live_sessions` com status `scheduled`, retorna `{ id, webRTCUrl }` (URL só para o dono).
- `startLive({ liveId })` — marca `status='live'`, `started_at=now()`.
- `endLive({ liveId })` — marca `status='ended'`, `ended_at=now()`, deleta Live Input na CF.
- `getLiveForCreator({ liveId })` — devolve credenciais WHIP (dono apenas).
- `getLiveForViewer({ liveId })` — devolve `{ hasAccess, playbackWhep, playbackHls, priceCents, live }`. Sem acesso: só metadados públicos e preço.
- `buyLiveTicket({ liveId, paymentMethod })` — integra Asaas PIX/cartão ou `pay_with_wallet('live_ticket', ...)`. Usa o mesmo pipeline de split 85/15.
- `listActiveLives()` / `getActiveLiveByCreatorProfile(profileId)` — usado pela badge/card.
- `postLiveComment`, `toggleLiveLike` — reaproveitando tabelas existentes.

Webhook Asaas em `src/routes/api/public/webhooks/asaas.ts` já processa `transaction_kind='live_ticket'` — adicionar caso.

Secrets necessárias (via `add_secret`): `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN` (token com permissão Stream:Edit).

## Frontend

**Rotas novas:**
- `src/routes/_authenticated/live.nova.tsx` — form (título, descrição, capa, preço) → cria live → redireciona para `/live/$liveId/broadcast`.
- `src/routes/_authenticated/live.$liveId.broadcast.tsx` — painel do creator: preview local, botão INICIAR/ENCERRAR, contador de viewers, chat, WHIP publish via `RTCPeerConnection`.
- `src/routes/_authenticated/live.$liveId.tsx` — viewer: se `hasAccess=false` mostra paywall (PIX / cartão / carteira / preço + botão "Entrar por R$X"); se `hasAccess=true` reproduz WHEP (fallback HLS via hls.js), chat, likes, emojis flutuantes reaproveitando `FloatingEmojiLayer`.

**Iniciar live (2 pontos de entrada):**
- FAB no `/dashboard` (creator) → `/live/nova`.
- Item "Iniciar live" no menu de ações do próprio perfil.

**Badge LIVE global:**
- Novo componente `src/components/live/LiveAvatarBadge.tsx` que envolve `<Avatar>`: anel verde animado + pill "LIVE" verde escuro no topo.
- Hook `useCreatorLiveStatus(creatorProfileId)` com `useQuery` + subscribe realtime em `live_sessions`.
- Aplicar em: `AvatarStack` (perfil), stories rings, feed cards, resultados de busca, header de chat, sidebar de threads, comentários. Um único componente wrapper minimiza retrabalho.
- Clicar na badge navega para `/live/$liveId`.

**Botão no card do perfil (`src/routes/_authenticated/perfil.$username.tsx`):**
- Abaixo da linha de contagem de amigos, dentro do mesmo container do "Editar perfil" — usar mesma classe `w-full`.
- Só renderiza se `useCreatorLiveStatus(profileId).isLive`.
- Verde (`bg-emerald-600 hover:bg-emerald-700`), texto "🔴 Assistir Live agora" (ou "Você está ao vivo — abrir painel" se for o dono).
- Navega para `/live/$liveId` (viewer) ou `/live/$liveId/broadcast` (dono).

## Detalhes técnicos

- WHIP publish: `fetch(webRTCUrl, { method:'POST', headers:{'Content-Type':'application/sdp'}, body: offer.sdp })` → set remote answer. Estados `idle`→`publishing`→`live`.
- WHEP playback: mesma técnica invertida no viewer; fallback `hls.js` se WebRTC falhar.
- `hls.js` já pode ser adicionado (`bun add hls.js`). Cloudflare Stream é edge-served, sem custo de servidor extra.
- Persona: toda live é carimbada com `creator_profile_id` da persona ativa (isolamento consistente com o resto do app).
- Isolamento por persona: badge e botão só aparecem quando a persona ativa do creator estiver ao vivo (o perfil paga e o gratuito são independentes).
- Preço mínimo/máximo: reaproveitar limites globais (min R$1,99, máx R$500) e validar server-side.
- Split 85/15 e liberação 30d nacional / 60d internacional passam pelo pipeline padrão de `transactions`.

## Entregáveis

1. Migração SQL (colunas + `live_tickets` + função `has_live_access` + trigger + realtime + `pay_with_wallet` extendida).
2. `add_secret` de `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_STREAM_API_TOKEN`.
3. `src/lib/lives.functions.ts` completo.
4. 3 rotas novas (`live.nova`, `live.$liveId.broadcast`, `live.$liveId`).
5. `LiveAvatarBadge` + `useCreatorLiveStatus` + integração nos principais surface avatars.
6. Botão de largura total no card de `/perfil/$username`.
7. FAB no dashboard + item de menu no próprio perfil.
8. Webhook Asaas: caso `live_ticket`.
