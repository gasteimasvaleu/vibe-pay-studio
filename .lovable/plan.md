Plano para corrigir a live travada em “Aguardando sinal da transmissão”:

1. Separar claramente transmissor de espectador
- Na rota `/live/:liveId/transmitir`, remover qualquer aparência de player de espectador.
- O transmissor deve sempre ver o preview local da própria câmera ou uma tela de erro/configuração, nunca a mensagem “Aguardando sinal da transmissão”.

2. Criar etapa de pré-transmissão dentro de `/transmitir`
- Se a live foi aberta diretamente, mostrar tela de preparação com:
  - preview da câmera;
  - botão para autorizar câmera/microfone;
  - seleção de câmera e microfone quando disponível;
  - botão “Iniciar transmissão”.
- Se veio de `/live/nova` com stream autorizado, pular direto para publicar.

3. Corrigir o início do WHIP
- O handshake WHIP só deve rodar depois de existir `MediaStream` válido.
- Validar se há ao menos uma faixa de vídeo ativa antes de postar para a Cloudflare.
- Exibir estados reais: “Preparando câmera”, “Enviando sinal para Cloudflare”, “Ao vivo” ou erro específico.

4. Melhorar feedback e diagnóstico
- Adicionar mensagens visuais no transmissor quando:
  - câmera/microfone não foram autorizados;
  - não existe câmera detectada;
  - o navegador bloqueou permissão;
  - a Cloudflare recusou o SDP/WHIP.
- Manter logs `[whip]` no console, mas a UX principal deve explicar o problema sem depender do console.

5. Preservar espectador
- A rota `/live/:liveId` continua usando `WhepPlayer` e pode mostrar “Aguardando sinal”.
- Apenas espectadores veem esse estado; o dono é redirecionado para `/transmitir` e vê o preview local.

6. Validação final
- Verificar no preview que `/live/:id/transmitir` não renderiza mais o texto “Aguardando sinal da transmissão”.
- Confirmar que a tela mostra preview local ou CTA de permissão antes de publicar.
- Confirmar que o botão de iniciar tenta publicar o WHIP e muda o status para transmissão ao vivo quando conectar.