
# Refinamento WhepPlayer + useLiveChat

Aplicar os dois padrões detalhados sem mudar o modelo de dados (`live_comments` continua sendo a fonte persistida). Componentes ficam isolados por canal — vídeo e chat não se conhecem.

## 1) WhepPlayer com estado e overlay

Arquivo: `src/components/live/WhepPlayer.tsx` (reescrever)

Mudanças:
- `new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] })`
- Criar `MediaStream` vazio e já anexar em `<video srcObject>`; no listener `track`, `event.streams[0].getTracks().forEach(t => remoteStream.addTrack(t))` (em vez de trocar `srcObject`)
- Estado `status: "connecting" | "playing" | "error"` — `setStatus("playing")` no primeiro `track`; `setStatus("error")` no catch
- Espera `iceGatheringState === "complete"` com timeout 2s (já feito, mas manter cleanup listener corretamente)
- Cleanup: `pc.getSenders().forEach(s => s.track?.stop())` + `pc.close()` + `video.srcObject = null`
- Wrapper `relative` com `<video muted autoPlay playsInline>` e overlay absoluto quando `status !== "playing"`:
  - `"connecting"`: spinner + "Conectando…"
  - `"error"`: "Não foi possível conectar" + botão "Tentar novamente" (bump numa key/version que reexecuta o effect)
- Manter props existentes (`whepUrl`, `objectFit`, `className`, `muted`) para não quebrar callers

## 2) Server functions para chat persistido

Arquivo novo: `src/lib/live-chat.functions.ts`

- `getLiveMessages` — `createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])`
  - Input: `{ streamId: string, limit?: number }` (default 100, max 200)
  - Retorna `{ messages: LiveChatMessage[] }` já projetadas em `{ id, userId, username, displayName, avatarUrl, text, ts }` (join com `profiles`)
  - Ordem ascendente por `created_at`
- `sendLiveMessage` — `createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])`
  - Input: `{ streamId: string, text: string }` (trim, 1..500 chars via Zod)
  - Rate limit simples em memória por `userId` (min 500ms entre envios); se violado, retorna `{ status: "rate_limited" }`
  - Insere em `public.live_comments` e retorna `{ message: LiveChatMessage }` com `id` real e timestamp do banco
  - (Sem alterações de schema; RLS existente já cobre insert do próprio usuário)

Tipo compartilhado exportado do módulo:
```ts
export type LiveChatMessage = { id: string; userId: string; username: string | null; displayName: string | null; avatarUrl: string | null; text: string; ts: number };
```

## 3) Hook `useLiveChat`

Arquivo novo: `src/components/live/useLiveChat.ts`

Estrutura conforme spec:
- Args: `{ streamId, sender?: { userId, username, displayName, avatarUrl } | null, onReaction?: (emoji: string) => void }`
- Estado: `messages: LiveChatMessage[]`, `viewers: number`, `sending: boolean`
- Refs: `subscribedRef`, `channelRef`, `onReactionRef` (sincronizado com prop)
- Chave anônima estável via `useRef(\`anon-\${crypto.randomUUID?.() ?? Math.random()}\`)`
- Carrega histórico: chama `getLiveMessages` server fn e faz merge com dedup por `id`, cap 200
- Topic estável `livecam:${streamId}`; antes de criar, itera `supabase.getChannels()` e remove qualquer canal existente com esse topic (anti-fantasma HMR)
- `supabase.channel(topic, { config: { broadcast: { self: true }, presence: { key: presenceKey } } })`
- Listeners:
  - `broadcast msg` → `appendDedup(payload)`
  - `broadcast reaction` → `onReactionRef.current?.(payload.emoji)`
  - `presence sync` → `setViewers(Object.keys(channel.presenceState()).length)`
- `.subscribe(async status => { if (status === "SUBSCRIBED") { subscribedRef.current = true; await channel.track({ joined_at: Date.now() }) } })`
- `appendDedup`: `useCallback`, cap 200
- `sendMessage(text)`:
  1. otimista com `optimisticId = local-...` → `appendDedup`
  2. `await sendLiveMessage({ data: { streamId, text } })` → substitui id no state
  3. espera `subscribedRef` até 1500ms em polling 50ms
  4. `channel.send({ type: "broadcast", event: "msg", payload: persisted ?? optimistic })`
- `sendReaction(emoji)`: espera subscribed até 1500ms; `channel.send({ type: "broadcast", event: "reaction", payload: { emoji } })`
- Cleanup: `untrack()` → `removeChannel()` → resetar refs e estados
- Deps do effect: `[streamId, presenceKey]` (não `onReaction`)

Retorno: `{ messages, viewers, sending, sendMessage, sendReaction }`

## 4) Refatorar `LiveChat.tsx` para usar o hook

- Remover fetch/insert direto no componente e uso de `useQuery`
- Obter sender via `supabase.auth.getUser()` uma vez (state local) — passar para o hook
- Renderizar mensagens do hook (agora com `username/displayName/avatarUrl` disponíveis: mostrar avatar pequeno + nome à esquerda do texto)
- Handler do form → `sendMessage(text)`
- Popover de reações → `sendReaction(emoji)` + `reactionsRef.current.push(emoji)` (mantém push local imediato; o broadcast com `self:true` também dispara `onReaction`, resultando em animação dupla — aceito conforme spec)
- Expor `viewers` do hook para o overlay superior via callback opcional `onViewersChange?: (n: number) => void` (viewer/broadcaster page usam para atualizar contador ao vivo em vez de depender só do polling)

## 5) Wire nos consumers

- `live.$liveId.tsx` e `live.$liveId.transmitir.tsx`:
  - Passam `onViewersChange={n => setLiveViewers(n)}` e usam esse valor no `LiveOverlayTop` (fallback para `viewersPeak` da server fn)

## Fora de escopo

- Rate limit distribuído (Redis/edge) — mantém memória local por worker; suficiente
- Moderação/ban
- Persistir reações
- Reply/quote/menções

## Passos

1. Criar `src/lib/live-chat.functions.ts` (getLiveMessages, sendLiveMessage)
2. Criar `src/components/live/useLiveChat.ts`
3. Reescrever `src/components/live/WhepPlayer.tsx` com status + overlay + STUN + MediaStream pré-anexado
4. Refatorar `src/components/live/LiveChat.tsx` para consumir `useLiveChat`
5. Ajustar `live.$liveId.tsx` e `live.$liveId.transmitir.tsx` para propagar `viewers` do hook ao overlay
6. Rodar tsgo e testar preview em desktop + mobile
