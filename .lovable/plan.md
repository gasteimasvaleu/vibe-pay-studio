# Emails de autenticação via Resend

Como o projeto usa Supabase próprio (não Lovable Cloud) e você já tem o Resend conectado com `monetisexy.com` verificado, vamos rotear os emails de auth do Supabase diretamente para o Resend usando o **Send Email Hook** do Supabase Auth.

## Como funciona

O Supabase Auth pode delegar o envio de TODOS os emails transacionais (signup confirmation, magic link, recovery, invite, email change, reauthentication) para um webhook HTTPS nosso, em vez do SMTP interno. O webhook recebe o payload com usuário + token/link, renderiza o template e envia via Resend.

```text
Signup / Reset / Magic Link
        │
        ▼
Supabase Auth ──(Send Email Hook + HMAC)──▶ /api/public/auth/email-hook
                                                   │
                                                   ├─ verifica assinatura
                                                   ├─ renderiza template
                                                   └─ POST Resend /emails
                                                             │
                                                             ▼
                                                     Usuário recebe email
                                                     de no-reply@monetisexy.com
```

## Passos

1. **Criar route pública** `src/routes/api/public/auth/email-hook.ts`
   - Verifica header `webhook-signature` (padrão Standard Webhooks, HMAC SHA-256) usando um segredo compartilhado
   - Lê o payload: `{ user, email_data: { token, token_hash, redirect_to, email_action_type, site_url } }`
   - Escolhe o template por `email_action_type` (`signup`, `recovery`, `magiclink`, `invite`, `email_change`, `reauthentication`)
   - Chama Resend via connector gateway (já configurado) usando `APP_EMAIL_FROM` = `Equipe Monetisexy <no-reply@monetisexy.com>`

2. **Templates HTML** em `src/lib/auth-email-templates.server.ts`
   - Um por tipo, com branding Monetisexy (mesmas cores/tipografia dos templates transacionais que já criamos em `src/lib/email-templates.server.ts`)
   - Botão CTA com link `{{site_url}}/auth/confirm?token_hash=...&type=...&redirect_to=...`

3. **Segredos**
   - `SUPABASE_AUTH_HOOK_SECRET` — gerado com generate_secret, usado tanto no painel Supabase quanto na verificação da route
   - `RESEND_API_KEY` e `LOVABLE_API_KEY` — já existem via connector

4. **Ação manual sua no Supabase Dashboard** (não posso fazer por API porque é Supabase próprio):
   - Authentication → Hooks → **Send Email Hook** → Enable
   - URL: `https://monetisexy.com/api/public/auth/email-hook` (ou a URL do preview durante teste)
   - Secret: colar o valor de `SUPABASE_AUTH_HOOK_SECRET`
   - Opcional: Authentication → Emails → desativar/limpar templates padrão para garantir que só o hook envia

5. **Teste**: criar conta nova → confirmar que chega email da Monetisexy pelo Resend (verificar no dashboard do Resend em Logs).

## Detalhes técnicos

- A route fica em `/api/public/*` para pular auth (Supabase chama sem sessão de usuário)
- Verificação de assinatura usa `standardwebhooks` — payload é `${msg_id}.${timestamp}.${body}`, comparação `timingSafeEqual`
- Rejeita timestamps com mais de 5 minutos de desvio
- Retorna 200 rápido; qualquer erro do Resend é logado mas não bloqueia (o Supabase re-tenta)
- Não mexemos em `src/lib/email.server.ts` (já usado para emails transacionais do app) — mesma infra Resend, código separado só para clareza

## O que NÃO faremos

- Não usar o scaffold de auth emails do Lovable (requer Lovable Cloud, que este projeto não tem)
- Não usar SMTP customizado do Supabase apontando pro Resend (funciona, mas o hook dá controle total sobre o template)
