## Problema

O espectador com ticket pago fica travado em "Conectando…" enquanto o dono transmite normalmente.

Causa: em `src/lib/lives.functions.ts` (`getLive`), o `whepUrl` devolvido ao viewer é montado por `resolveActiveWhepUrl`, que usa o **UID do vídeo** listado em `/stream/live_inputs/:uid/videos` e monta `https://<host>/<videoUid>/webRTC/play`.

Para lives ingeridas via **WHIP (WebRTC)** na Cloudflare Stream, o WHEP correto é o do **próprio Live Input** — a URL que a Cloudflare devolveu em `webRTCPlayback.url` no `startLive` e que já está salva em `live_sessions.cf_webrtc_play_url` (formato `.../<liveInputUID>/webRTC/play`). O caminho por videoUid só existe para o VOD gerado após o fim, então enquanto a live está no ar a resposta WHEP fica sem tracks (o `track` event nunca dispara → overlay "Conectando…" para sempre).

## Correção

### `src/lib/lives.functions.ts` — `getLive`
- Deixar de chamar `resolveActiveWhepUrl`.
- Devolver `whepUrl = live.cf_webrtc_play_url` (fallback para `cf_webrtc_url`) quando `canWatch && status === "live"`; caso contrário `null`.
- Manter `hlsUrl` como fallback (já usado pelo `WhepPlayer`).

### `src/lib/cloudflare-stream.server.ts`
- Marcar `resolveActiveWhepUrl` / `listLiveInputVideos` como não utilizados e remover para evitar chamadas extras à API (opcional; deixar apenas o export se algo mais consumir — hoje só `getLive` consome).

### Escopo
- Nenhuma mudança de UI, de banco ou de fluxo do publisher.
- `WhepPlayer` já lida com retry/backoff/HLS-fallback; após a correção o `pc.ontrack` passa a disparar e o player entra em `playing`.

## Validação
1. Iniciar live com o dono (`/transmitir`).
2. Como outro usuário, pagar o ticket e abrir `/live/:id`.
3. Console deve mostrar `pc.ontrack` disparando; overlay some em <2s.
4. Encerrar a live — viewer recebe `ended` normalmente.
