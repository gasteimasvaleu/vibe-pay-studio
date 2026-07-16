## Objetivo

Após o cadastro por e-mail (sem sessão retornada), redirecionar para uma nova página `/cadastro/confirme-email` em vez de mostrar apenas o texto de sucesso inline.

## Mudanças

### 1. Nova rota `src/routes/cadastro.confirme-email.tsx`
- Rota pública, mesma "navbar superior" que a `/cadastro` (logo Monetisexy centralizado no topo + footer com Termos/Privacidade/Ajuda), para manter consistência.
- Lê `email` via `validateSearch` (zod) para exibir "Enviamos um link para **email@exemplo.com**".
- Card central com:
  - Título "Confirme seu e-mail" + instruções curtas ("Abra o link que enviamos para ativar sua conta. Não esqueça de checar a caixa de spam.").
  - Botão primário **"Já confirmei"** → chama `supabase.auth.getUser()`; se houver usuário confirmado, `routeAfterAuth(navigate)` (vai para `/feed`); caso contrário, mostra aviso "Ainda não detectamos a confirmação. Tente novamente em instantes."
  - Botão secundário **"Reenviar e-mail"** → `supabase.auth.resend({ type: "signup", email })` com estado de loading, cooldown de 30s e mensagens de sucesso/erro (usando `getAuthErrorMessage`).
  - Link discreto "Usar outro e-mail" voltando para `/cadastro`.

### 2. `src/routes/cadastro.tsx`
- No `onSubmit`, quando `signUpWithEmail` retornar sem `data.session`, trocar o `setSuccessMsg(...)` por `navigate({ to: "/cadastro/confirme-email", search: { email } })`.
- Remover o estado `successMsg` (não é mais usado) e sua renderização.

## Fora do escopo

- Não altero `/auth/confirm`, o hook de e-mail nem o template.
- Não crio página nova para recovery/reset de senha.
- Sem mudanças em backend.
