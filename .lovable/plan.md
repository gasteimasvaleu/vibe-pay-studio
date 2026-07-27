Vou reabrir o formulário seguro para você colar o novo token Cloudflare Stream (com permissão **Account → Stream → Edit** na conta correta).

Passos:
1. Abrir `update_secret` para `CLOUDFLARE_STREAM_API_TOKEN`.
2. Após você salvar, testar `POST /accounts/{id}/stream/live_inputs` a partir do servidor para confirmar que o 403 sumiu (sem logar o token).
3. Se ok, validar o fluxo `/live/nova` → `/live/$liveId/transmitir` de ponta a ponta.
4. Se ainda 403, reportar código exato do erro Cloudflare e indicar qual permissão/conta ajustar.