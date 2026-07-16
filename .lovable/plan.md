# Finalizar Send Email Hook via Resend

O código do hook já está pronto de mensagens anteriores:
- `src/routes/api/public/auth/email-hook.ts` — route pública que verifica HMAC (Standard Webhooks) e envia via Resend gateway
- `src/lib/auth-email-templates.server.ts` — templates HTML branded (signup, recovery, magic link, invite, email_change, reauthentication)
- Secret `AUTH_EMAIL_HOOK_SECRET` já provisionado

## O que falta (não é código — é config no Supabase)

Como o Supabase é seu (não Lovable Cloud), a configuração do hook em `auth.config` só pode ser feita por você no Dashboard. Passos:

1. **Gerar segredo base64** no terminal:
   ```bash
   openssl rand -base64 48
   ```

2. **Atualizar `AUTH_EMAIL_HOOK_SECRET` no Lovable** com esse mesmo valor (só a parte base64, sem prefixo). Vou abrir o formulário seguro na próxima mensagem.

3. **Supabase Dashboard → Authentication → Hooks → Send Email Hook**:
   - Enable
   - Hook URL: `https://monetisexy.com/api/public/auth/email-hook`
   - Secret: `v1,whsec_<mesmo_valor_base64>` (com prefixo)

4. **Testar** com um cadastro novo — email deve chegar de `Equipe Monetisexy <no-reply@monetisexy.com>` via Resend (confere no dashboard do Resend em Logs).

## Ajustes que faço em código quando aprovar

- Chamar `update_secret` (formulário seguro) pro `AUTH_EMAIL_HOOK_SECRET` — assim você cola o valor gerado e ele fica sincronizado.
- Verificar se o `AUTH_EMAIL_HOOK_SECRET` gerado antes ainda está lá e substituir pelo seu valor.

Nenhum outro arquivo precisa mudar — o código já suporta secret em formato base64.

## Notas

- Não posso automatizar o passo 3 (dashboard Supabase) sem um Personal Access Token seu da Management API.
- Uma vez configurado, funciona indefinidamente — não precisa refazer.
- Rate limit do Supabase (`Authentication → Rate Limits → Emails per hour`) precisa estar alto o suficiente pro seu volume; default é bem baixo.
