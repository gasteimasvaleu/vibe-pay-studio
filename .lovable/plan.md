Plano para corrigir o “Não foi possível conectar” da live:

1. Ajustar o player WHEP
   - Tratar `409 Conflict` como estado temporário de “aguardando transmissão”, não como erro final.
   - Ler o header `Retry-After` e tentar reconectar automaticamente com backoff enquanto a live estiver ativa.
   - Exibir uma mensagem mais correta: “Aguardando sinal da transmissão…” em vez de “Não foi possível conectar” para 409.
   - Manter botão “Tentar novamente” apenas para erros reais ou timeout prolongado.

2. Corrigir a transmissão WHIP do criador
   - Usar o mesmo STUN recomendado no transmissor (`stun:stun.cloudflare.com:3478`).
   - Aguardar ICE gathering de forma consistente antes do POST WHIP.
   - Adicionar estados visuais claros para “Conectando câmera”, “Transmitindo” e “Falha ao iniciar transmissão”.
   - Se o POST WHIP falhar, mostrar o status HTTP real no toast para facilitar diagnóstico.

3. Melhorar sincronização entre transmissor e viewer
   - Só mostrar badge “AO VIVO” no viewer quando houver sessão ativa e tentativa WHEP bem-sucedida; antes disso, mostrar “iniciando”.
   - Invalidar/refazer metadados da live após o transmissor conectar.
   - Evitar que a tela de assistir tente conectar agressivamente antes do Cloudflare aceitar o stream.

4. Fallback de reprodução
   - Se WHEP continuar indisponível após algumas tentativas, usar o HLS (`cf_playback_hls`) como fallback quando disponível.
   - Mostrar uma mensagem amigável se nem WHEP nem HLS estiverem prontos ainda.

5. Validação
   - Conferir no navegador que a página `/live/:id/transmitir` não fica em erro enquanto a transmissão ainda está subindo.
   - Confirmar que `/live/:id` deixa de mostrar erro 409 e passa a tentar reconectar automaticamente até receber vídeo.

Base técnica confirmada: o console mostra `WHEP 409`; pela especificação WHEP, 409 significa que o player tentou assistir antes de existir publicação ativa no endpoint, e deve repetir usando `Retry-After`/backoff em vez de falhar definitivamente.