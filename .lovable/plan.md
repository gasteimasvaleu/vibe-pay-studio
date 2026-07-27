Plano para corrigir o erro ao iniciar live:

1. Diagnosticar a resposta da Cloudflare sem expor segredo
   - Ajustar temporariamente a camada `cloudflare-stream.server.ts` para registrar status HTTP, código e mensagem retornados pela Cloudflare, sem logar token nem headers sensíveis.
   - Diferenciar claramente erro de token inválido, Account ID incorreto e permissão insuficiente.

2. Corrigir a integração do Cloudflare Stream
   - Manter o token lido apenas no backend via `process.env.CLOUDFLARE_STREAM_API_TOKEN`.
   - Validar se o endpoint usado para criar Live Input está correto para Stream.
   - Melhorar o tratamento de erro para retornar uma mensagem útil no toast, em vez de apenas `[cloudflare-stream] Authentication error`.

3. Garantir que o token tenha as permissões certas
   - Se o erro confirmar permissão/token, vou abrir o formulário seguro para atualizar `CLOUDFLARE_STREAM_API_TOKEN`.
   - O token precisa ser um Cloudflare API Token com permissão de edição do produto Stream na conta correspondente ao `CLOUDFLARE_ACCOUNT_ID`.

4. Validar a criação da live
   - Testar novamente o fluxo de `/live/nova` até criar o registro em `live_sessions` e navegar para `/live/$liveId/transmitir`.
   - Confirmar que a live recebe `whipUrl`, `whepUrl` e `cf_live_input_id` antes de finalizar.