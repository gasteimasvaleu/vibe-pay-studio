## Problema

O link "Confirmar meu e-mail" está abrindo `https://<ref>.supabase.co/auth/confirm?...` e o Supabase responde `No API key found in request`.

Causa: em `src/lib/auth-email-templates.server.ts`, o `confirmUrl` é montado usando `p.site_url` (o valor `site_url` vindo do payload do hook aponta para o domínio do projeto Supabase, não para o app). Também não existe uma rota `/auth/confirm` no app para consumir o `token_hash`.

## Correções

1. **`src/lib/auth-email-templates.server.ts`**
   - Trocar a base do `confirmUrl` para sempre usar `APP_BASE_URL` (`https://monetisexy.com`), ignorando `p.site_url`.
   - Manter `token_hash`, `type` e `next` como query params.

2. **Novo `src/routes/auth.confirm.tsx`** (rota pública)
   - Ler `token_hash`, `type` e `next` da URL.
   - Chamar `supabase.auth.verifyOtp({ type, token_hash })` no cliente.
   - Em caso de sucesso: `navigate({ to: next ?? "/feed" })`.
   - Em caso de erro (link expirado/inválido): mostrar mensagem amigável com botão para voltar a `/entrar` ou reenviar.
   - Para `type=recovery`: redirecionar para uma tela de nova senha (usar `/entrar` com aviso por enquanto, já que não existe página dedicada — confirmar com o usuário se quer que eu crie `/reset-password`).

3. **Publicar** para o hook e a nova rota ficarem ativos em `monetisexy.com`.

## Fora do escopo

- Não mexo em `email-hook.ts`, no segredo, nem no template visual.
- Não crio página de reset de senha nova nesta rodada (a menos que você peça).