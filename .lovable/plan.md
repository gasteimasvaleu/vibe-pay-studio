## Diagnóstico

O prompt de permissão de câmera/microfone do navegador não aparece porque o preview do Lovable roda dentro de um `<iframe>` que **não** declara `allow="camera; microphone"`. Sem esse atributo, `navigator.mediaDevices.getUserMedia()` é rejeitado imediatamente com `NotAllowedError` (Permissions Policy) e o navegador não chega a exibir o pop-up de permissão.

Sinais que confirmam a hipótese:
- Nenhum log `[whip] getUserMedia:start` foi capturado no console (a chamada nem chega a resolver/rejeitar visivelmente).
- O toast "Autorize câmera e microfone" que você viu é apenas o `toast.success` de `live.nova.tsx` após criar a live — não é um erro real de permissão.
- Em produção (`monetisexy.com`, aba própria), a chamada roda em top-level frame com origem segura e o prompt aparece normalmente.

Não podemos adicionar `allow=` no iframe do preview (o host é do Lovable). A solução é detectar o cenário e oferecer uma saída imediata, além de melhorar a mensageria de erro em qualquer caso de falha do `getUserMedia`.

## O que vou fazer

Edições apenas em `src/routes/_authenticated/live.$liveId.transmitir.tsx`:

1. **Detecção precoce de bloqueio por Permissions Policy**
   - Antes de chamar `getUserMedia`, checar se estamos em iframe (`window.self !== window.top`) e se `document.featurePolicy`/`navigator.permissions` reportam `camera`/`microphone` como negados.
   - Se estiver bloqueado, pular a chamada e ir direto ao estado de erro `permission-blocked`, sem toast enganoso.

2. **Novo estado `permission-blocked` com UI acionável**
   - Overlay explicando: "Este preview não pode acessar câmera/microfone. Abra a transmissão em uma nova aba para autorizar."
   - Botão primário **"Abrir em nova aba"** que faz `window.open(location.href, '_blank')` (ou navega o `window.top` para o URL de preview em nova aba).
   - Botão secundário **"Tentar novamente"** que reexecuta o fluxo.

3. **Mensagens específicas por erro de `getUserMedia`**
   - `NotAllowedError` → "Permissão negada. Autorize a câmera/microfone nas configurações do navegador."
   - `NotFoundError` / `OverconstrainedError` → "Nenhuma câmera/microfone disponível."
   - `NotReadableError` → "Câmera/microfone em uso por outro aplicativo."
   - `SecurityError` → mesma mensagem do `permission-blocked` (com botão nova aba).
   - Outros → mensagem genérica atual.

4. **Logs de diagnóstico**
   - `console.info('[whip] context', { inIframe, isSecure, hasMediaDevices })` no início do efeito para confirmar o cenário em futuras investigações.

Nenhuma mudança em backend, banco, `WhepPlayer` ou lógica WHIP em si — o handshake WebRTC atual já está correto; o bloqueio é somente na captura de mídia local dentro do iframe.

## Como testar depois

1. No preview do editor: abrir `/live/<id>/transmitir` → deve mostrar o novo overlay com "Abrir em nova aba".
2. Clicar em "Abrir em nova aba" → nova aba carrega a mesma rota em top-level, o prompt do navegador aparece, e após autorizar a transmissão sobe (viewer sai de "Aguardando sinal").
3. Em `monetisexy.com` (produção) direto: fluxo normal, sem overlay de bloqueio.
