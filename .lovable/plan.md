## Diagnóstico

O toast `[cloudflare-stream] Authentication error` vem direto da API da Cloudflare (`/accounts/{id}/stream/live_inputs`). O código em `src/lib/cloudflare-stream.server.ts` está correto — ele envia `Authorization: Bearer <CLOUDFLARE_STREAM_API_TOKEN>` para a conta `CLOUDFLARE_ACCOUNT_ID`. Ambos os secrets existem no projeto, então a Cloudflare está rejeitando as credenciais em si.

Causas possíveis (em ordem de probabilidade):
1. **Token sem permissão `Stream:Edit`** — o token foi criado só com leitura ou para outro produto (Workers, R2, etc.).
2. **Account ID errado** — o `CLOUDFLARE_ACCOUNT_ID` não pertence à conta onde o token foi emitido.
3. **Token expirado, revogado ou com IP allowlist restritivo**.

Não há bug de código a corrigir; a correção é regenerar/atualizar o secret com um token válido para Stream.

## Plano

1. **Você gera um novo API Token na Cloudflare** em https://dash.cloudflare.com/profile/api-tokens → *Create Token* → *Custom token* com:
   - Permission: **Account → Stream → Edit**
   - Account Resources: **Include → sua conta específica** (a mesma cujo ID está em `CLOUDFLARE_ACCOUNT_ID`)
   - Sem TTL curto, sem IP filter (ou libere o IP dos Workers)
2. **Confirmar o Account ID**: no dashboard da Cloudflare, painel direito da home da conta, copiar "Account ID" e comparar com o secret `CLOUDFLARE_ACCOUNT_ID` atual (se divergir, também atualizar).
3. Eu abro os formulários seguros de secret para você colar:
   - `update_secret` em `CLOUDFLARE_STREAM_API_TOKEN` (novo token)
   - `update_secret` em `CLOUDFLARE_ACCOUNT_ID` (só se estiver diferente)
4. Você tenta "Ir ao vivo agora" novamente. Se ainda falhar, eu leio os logs do server-fn `createLive` para pegar a mensagem exata da Cloudflare (às vezes vem "Unknown X-Auth-Key or X-Auth-Email" vs "Invalid API Token" — cada um aponta para uma causa diferente) e ajustamos.

## Detalhes técnicos

- Endpoint chamado: `POST https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs`
- Header: `Authorization: Bearer {CLOUDFLARE_STREAM_API_TOKEN}`
- Resposta atual: `success: false` com `errors[0].message` ≈ "Authentication error" → 100% credencial, 0% payload.
- Nenhuma alteração de código, schema ou UI é necessária neste plano.
