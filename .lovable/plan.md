# Videochamadas 1:1 no /chat com Daily.co

Hoje `/chat` só troca mensagens. A tabela `video_calls` e as server functions (`requestVideoCall`, `respondVideoCall`, `payVideoCall`, `completeVideoCall`, `listVideoCalls`) já existem, mas nenhuma UI as usa e não há provedor de vídeo. Vamos ligar tudo isso ao Daily.co.

## Fluxo (assinante ↔ criador)

1. Assinante abre uma conversa com um criador que tem `video_call_enabled = true` e clica no ícone de câmera no header do thread.
2. Modal "Solicitar videochamada" mostra preço (`video_call_price_cents`), duração padrão (`video_call_default_minutes`, editável dentro de um range) e saldo disponível. Ao confirmar, chama `requestVideoCall` → cria linha em `video_calls` com status `requested`.
3. Uma mensagem-sistema é postada na thread ("📹 Videochamada solicitada — R$ X por Y min. Aguardando criador."), com botões contextuais.
4. Criador vê o card na thread e no novo painel "Chamadas" (aba dentro de `/chat`) e pode **Aceitar** ou **Recusar** (`respondVideoCall`).
5. Ao aceitar, o assinante recebe botão **Pagar** que:
   - Se saldo ≥ preço: chama `payVideoCall` (débito de carteira, status → `paid`).
   - Senão: abre `PaymentModal` (PIX/cartão) reutilizando o fluxo Asaas existente; após reconciliação webhook, `video_calls.payment_status = paid`.
6. Assim que `status = paid`, uma nova server function `startVideoCall` cria uma **sala Daily** com `exp = now + duração + 5min`, salva `room_url` e emite tokens de acesso (owner=criador, participant=assinante). O status vira `active`.
7. Ambos veem o botão **Entrar na chamada** que abre `/chat/call/$callId` — página full-screen com o `<DailyIframe>` embutido (SDK `@daily-co/daily-js` + `@daily-co/daily-react`).
8. Timer server-authoritative: quando o token expira, Daily encerra a sala. No `leave` do participante ou timeout, chamamos `completeVideoCall` que:
   - Marca `ended_at`, `status = completed`.
   - Cria `transactions` de repasse (creator recebe líquido conforme comissão padrão) — reaproveitar a mesma função contábil de tips.
9. Se o criador **recusar** ou o assinante **cancelar** antes de pagar, status = `rejected/cancelled` e nenhum débito ocorre. Se pagou mas a sala nunca abriu (criador não entrou em X min), refund automático via `refundVideoCall` (nova função) devolvendo ao `subscriber_wallets`.

## Mudanças

### Segredos
- `add_secret DAILY_API_KEY` (chave server do Daily). Domínio (subdomain) fica em `DAILY_DOMAIN` (public — pode ir em código ou secret set_secret).

### Backend
- `src/lib/video-calls.server.ts` — helper `createDailyRoom({ name, expSeconds, maxParticipants: 2 })` e `createMeetingToken({ room, isOwner, userName, expSeconds })` batendo em `https://api.daily.co/v1/rooms` e `/meeting-tokens`. Ler `DAILY_API_KEY` dentro dos handlers.
- Estender `src/lib/communication.functions.ts`:
  - `startVideoCall({ callId })` — só criador; exige `status='paid'`; cria sala + token owner, grava `room_url` e `provider_ref`, muda para `active`. Retorna `{ roomUrl, ownerToken }`.
  - `joinVideoCall({ callId })` — devolve token do requester (owner ou participant conforme papel).
  - `refundVideoCall({ callId })` — cancela paga não iniciada, credita carteira.
  - `completeVideoCall` — ao completar, gera repasse ao criador (reutilizar utilitário de split usado em tips).
- Cron leve opcional: nada por enquanto — refund/timeout tratados no `join` (se `now > paid_at + 30min` sem `started_at`, retornar erro e chamar refund).

### Frontend
- `src/components/chat/VideoCallButton.tsx` — ícone câmera no header da thread; abre `RequestVideoCallDialog` (mostra preço/duração/saldo, botão confirmar).
- `src/components/chat/VideoCallMessage.tsx` — card renderizado inline na thread (nova coluna opcional `video_call_id` em `chat_messages` **ou** convenção via `metadata` JSON — usaremos coluna `video_call_id uuid` nullable para tipagem forte). Migração adiciona a coluna + RLS não muda. Estados: `requested` (criador vê aceitar/recusar), `accepted` (assinante vê pagar), `paid` (criador vê iniciar; assinante vê aguardar), `active` (ambos veem "Entrar"), `completed`/`rejected`/`cancelled` (resumo).
- `src/routes/_authenticated/chat.call.$callId.tsx` — rota full-screen; carrega `joinVideoCall`, monta `<DailyProvider>` + `<DailyVideo>` (SDK `@daily-co/daily-react`). Controles: mute mic/cam, sair. Ao sair → volta `/chat`, dispara `completeVideoCall` se for o último a sair (server valida).
- `src/routes/_authenticated/chat.tsx` — adicionar aba lateral "Chamadas" (lista via `listVideoCalls`) e o botão de câmera no header.

### Dependências
- `bun add @daily-co/daily-js @daily-co/daily-react`

### Configurações (banco)
- Criador precisa ter `video_call_enabled + price + default_minutes` — já existente em `creator_profiles`. Página `/settings` (chat-settings) já expõe? Se não, adicionar toggle + preço + duração ali (fora do escopo se já existir; verificar durante build).

## Detalhes técnicos

- Daily rooms: `properties.exp` = timestamp Unix; `enable_prejoin_ui=false`; `enable_screenshare=false`; `max_participants=2`. Nome único = `mtx-<callId>`.
- Tokens: owner (criador) recebe `is_owner=true` para poder encerrar. Ambos com `exp` igual ao da sala.
- Recorder/gravação: **desligado** por padrão (privacidade). Adicionar depois se pedido.
- Sem WebRTC direto — todo tráfego Daily. Sem CORS extra (só chamadas server→Daily REST + client→Daily via SDK oficial).
- RLS `video_calls` já cobre requester/creator; garantir política SELECT permitindo ambos verem `room_url` apenas quando `status IN ('paid','active','completed')`.

## Fora do escopo desta etapa
- Chamadas de grupo / lives (já existem em `/live`).
- Agendamento futuro (`scheduled_at`) — coluna existe mas não vamos expor UI agora; chamadas são "on-demand".
- Gravação e transcrição.

Pronto para implementar assim que aprovado. Vou pedir a `DAILY_API_KEY` no início da build.
