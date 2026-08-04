# Google login deve levar ao feed/onboarding, não à página inicial

## O que está acontecendo

`signInWithGoogle` em `src/lib/auth.ts` pede o retorno para
`window.location.origin`, ou seja, a raiz `/` — a landing page. Depois do
consentimento, o Google devolve o usuário exatamente ali, e nada no app decide
para onde ele deveria ir de fato.

O `navigate({ to: "/" })` que existe no botão em `src/routes/entrar.tsx` nunca
chega a rodar: a página já foi embora para o Google antes disso.

## O que muda

Criar uma rota pública de retorno de OAuth que confirma a sessão e encaminha o
usuário para o destino correto — o mesmo comportamento do login por e-mail.

1. **Nova rota `src/routes/auth.callback.tsx`** (pública, `noindex`):
   - Aguarda a sessão via `supabase.auth.getSession()` e um listener de
     `onAuthStateChange` (o token vem no hash da URL e o cliente processa de
     forma assíncrona).
   - Com sessão: chama `ensureCurrentUserProfile()` (cria o profile do usuário
     Google no primeiro acesso) e depois `resolveCreatorOnboardingStep()`,
     navegando para o passo pendente ou `/feed`.
   - Sem sessão após o timeout: volta para `/entrar` com mensagem de erro.
   - Enquanto isso, mostra um estado de carregamento simples ("Entrando...").

2. **`src/lib/auth.ts`**: `signInWithGoogle` passa a usar
   `redirectTo: ${window.location.origin}/auth/callback`.

3. **`src/routes/entrar.tsx`** e **`src/components/site/LoginCard.tsx`**:
   remover o `navigate({ to: "/" })` após `signInWithGoogle` (código morto que
   só confunde) e manter o estado de "Redirecionando...".

## Configuração necessária no Supabase

Em **Authentication → URL Configuration → Redirect URLs**, os padrões `/**` já
cadastrados cobrem `/auth/callback`. Nada mais a alterar.

## Detalhes técnicos

- A rota é pública e fora de `_authenticated`: no instante do retorno o gate
  ainda poderia não enxergar a sessão e causar bounce para `/entrar`.
- O redirecionamento só acontece depois que a sessão está confirmada, evitando
  a corrida com o `beforeLoad` do subtree protegido.
- Reaproveita `ensureCurrentUserProfile` e `resolveCreatorOnboardingStep`, já
  usados no login por e-mail e na confirmação de e-mail — nenhuma regra nova de
  negócio, schema ou RLS.

## Verificação

Login com Google a partir de `/entrar` e da landing: após escolher a conta, o
usuário deve cair em `/feed` (ou no passo pendente de onboarding, se for
creator incompleto), nunca na página inicial deslogada.
