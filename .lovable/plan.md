# Corrigir "Aguardando sinal…" — resolver videoUID ativo do Cloudflare

## Causa raiz confirmada

O `whepUrl` salvo em `live_sessions.cf_webrtc_play_url` é o `webRTCPlayback.url` retornado por `POST /stream/live_inputs`, que aponta para o **UID do Live Input**, não para o **videoUID do vídeo ao vivo**. A Cloudflare só entrega mídia via WHEP no endpoint do vídeo ativo (`/{videoUID}/webRTC/play`), gerado apenas depois que o transmissor conecta. Por isso o POST WHEP retorna answer SDP sem tracks e o player fica preso em "Aguardando sinal…", mesmo com o Live Input aparecendo "Connected" no painel Cloudflare.

Guidance do app de referência (livecam) confirma: `whepUrl` precisa ser resolvido dinamicamente consultando `/stream/live_inputs/:id/videos` e pegando o último `uid` com status `live-inprogress`.

## Mudanças

### 1. `src/lib/cloudflare-stream.server.ts`
- Adicionar `listLiveInputVideos(uid)` → `GET /stream/live_inputs/{uid}/videos`, retornando `{ uid, status: { state } }[]`.
- Adicionar `resolveActiveWhepUrl(liveInputUid)` que:
  1. Chama `listLiveInputVideos`.
  2. Filtra por `state === "live-inprogress"` (fallback: pega o mais recente por `created`).
  3. Extrai o `customer-<hash>.cloudflarestream.com` do `webRTCPlayback.url` do Live Input (já armazenado) e monta `https://customer-<hash>.cloudflarestream.com/{videoUID}/webRTC/play`.
  4. Retorna `null` quando não houver vídeo ativo.

### 2. `src/lib/lives.functions.ts`
- Em `getLive`, quando `status === "live"` e o viewer tem `canWatch`, chamar `resolveActiveWhepUrl(cf_live_input_id)` e devolver esse URL em `whepUrl` (não o cache do banco). Se retornar `null`, devolver `whepUrl: null` e deixar o cliente aguardar.
- Manter `cf_webrtc_play_url` apenas como referência do host; parar de servi-lo direto ao viewer.
- HLS (`hlsUrl`) continua servindo como fallback.

### 3. `src/routes/_authenticated/live.$liveId.tsx` (viewer)
- Já usa React Query no `getLive`. Adicionar `refetchInterval: 4000` enquanto `whepUrl` estiver `null` e `status === "live"`, para pegar o videoUID assim que ele aparecer.
- Sem mudanças no `WhepPlayer` (a lógica de retry/HLS já está correta e vai funcionar naturalmente quando o URL certo chegar).

### 4. `src/routes/_authenticated/live.$liveId.transmitir.tsx` (WHIP)
Reforçar o handshake conforme checklist do app de referência:
- Trocar `pc.addTrack(track, stream)` (sendrecv implícito) por `pc.addTransceiver(track, { direction: "sendonly", streams: [stream] })` para áudio e vídeo — a Cloudflare rejeita silenciosamente transceivers `sendrecv`.
- Garantir `await waitForIceGathering(pc, 8000)` antes do `POST` WHIP (não-trickle).
- POST com `Content-Type: application/sdp` e body cru (`pc.localDescription.sdp`); parsear resposta com `res.text()`.
- Guardar o header `Location` da resposta WHIP para `DELETE` no `endLive` / unmount.
- Log `[whip] state=<...>` em `iceconnectionstatechange` e `connectionstate` para diagnóstico.

### 5. Diagnóstico rápido pós-fix
Depois de aplicar, com uma live de teste rodando, verificar:
- Network do viewer: `POST .../{videoUID}/webRTC/play` → 201 com `v=0…` no body.
- Network do transmissor: `POST .../{liveInputUID}/webRTC/publish` → 201.
- Console do transmissor: `[whip] state=connected`.

## Fora de escopo

- Não altera esquema de banco (nenhuma migração).
- Não mexe em UI de chat/doadores/overlays.
- Não altera fluxo de pagamento/ticket.
