## Diagnóstico

O Live Input existe (a live aparece no painel do Cloudflare e `cf_webrtc_url` está salvo), o WHEP do viewer também está OK — ele fica em "Aguardando sinal" porque a Cloudflare nunca recebeu mídia. Ou seja, o WHIP do transmissor está montando a PeerConnection e fazendo o POST, mas a Cloudflare não aceita o handshake ou o navegador não consegue completar o ICE. As causas mais prováveis, com base na doc oficial de WebRTC do Cloudflare Stream e nos clientes de referência (`@eyevinn/whip-web-client`, `WHIPClient.js`):

1. **Direção dos transceivers errada.** Usamos `pc.addTrack(...)` sem forçar `sendonly`. Cloudflare valida o SDP como ingest e clientes reais chamam `pc.addTransceiver('video', { direction: 'sendonly' })` e depois `sender.replaceTrack(track)`. Com `sendrecv` (default do addTrack) o handshake da Cloudflare pode falhar silenciosamente sem trocar mídia.
2. **Falta de resposta ao redirecionamento WHIP.** A Cloudflare responde `201 Created` com um header `Location` que aponta para a "resource URL" da sessão. Se essa URL não for guardada e o navegador entrar em `iceconnectionstate = failed`, a sessão morre. Hoje ignoramos o `Location`.
3. **ICE gathering bloqueando por 3.5 s.** Alguns navegadores (Safari em especial) demoram >5 s para reunir todos candidatos; o POST vai com SDP incompleto e o Cloudflare não consegue conectar. O padrão recomendado é trickle ICE (POST cedo, PATCH candidatos) — mas como primeiro corte basta subir o timeout e aceitar `iceGatheringState !== 'complete'`.
4. **Sem telemetria.** Não temos como saber, hoje, em que passo específico está travando (getUserMedia OK? offer criado? WHIP retornou 2xx? ICE chegou a `checking`?). Isso precisa aparecer na UI e no console para não ficarmos no chute.

## O que vou fazer

### 1. Reescrever o handshake WHIP em `src/routes/_authenticated/live.$liveId.transmitir.tsx`

- Substituir `addTrack` por dois `addTransceiver` explícitos:
  ```ts
  const videoTx = pc.addTransceiver('video', { direction: 'sendonly' });
  const audioTx = pc.addTransceiver('audio', { direction: 'sendonly' });
  await videoTx.sender.replaceTrack(stream.getVideoTracks()[0]);
  await audioTx.sender.replaceTrack(stream.getAudioTracks()[0]);
  ```
- Trocar `waitForIceGathering(pc, 3500)` por espera de **até 8 s** OU primeiro candidato relay/host, o que vier antes.
- Fazer o POST com `Content-Type: application/sdp` (já OK) e ler `res.headers.get('Location')` para guardar a `resourceUrl` — usada no `DELETE` de encerramento (fecha a sessão do lado do Cloudflare, em vez de deixar zumbi).
- Ampliar o log de erro: incluir `res.status`, primeiros 300 chars do body, e o `sdp` local truncado no `console.error` (não no toast).

### 2. Instrumentação visível

- Adicionar estados granulares (`getting-media`, `creating-offer`, `waiting-ice`, `posting-whip`, `waiting-ice-connect`, `live`, `error:<motivo>`) e mostrar o estado atual no chip inferior do vídeo enquanto `!connected`.
- `console.info('[whip] <passo>', payload)` em cada transição para o usuário conseguir colar o log se der ruim.
- Se o POST retornar erro, mostrar o status HTTP e o começo do body no toast (hoje só mostramos a mensagem genérica).

### 3. Encerramento limpo

- No cleanup do `useEffect` e no `handleEnd`, se `resourceUrl` existir, fazer `fetch(resourceUrl, { method: 'DELETE' })` antes de fechar o PC. Isso evita o Live Input ficar preso do lado do Cloudflare (o que pode causar 409 nos próximos WHIP/WHEP até expirar).

### 4. Não mudo agora (mas fica registrado)

- Migrar para `@eyevinn/whip-web-client` (cliente de referência testado pelo Cloudflare) é uma alternativa mais robusta que a nossa implementação manual. Se depois desta rodada ainda houver falha, esse é o próximo passo — mas prefiro consertar o nosso primeiro porque já temos o restante do ciclo (encerrar, viewer count, chat) integrado.

## Verificação

- Abrir `/live/<id>/transmitir` em uma aba, `/live/<id>` em outra.
- Confirmar no console `[whip]` avançando até `live`.
- Confirmar que o chip do viewer sai de "INICIANDO" para "AO VIVO" em <10 s.
- Se falhar, o toast passa a informar exatamente onde parou (status HTTP ou estado ICE) para a próxima iteração.
