# Corrigir login com Google (redirecionamento para localhost:3000)

## O que está acontecendo

Depois do consentimento do Google, o Supabase devolveu o usuário para
`localhost:3000/#access_token=...`. O Safari não consegue abrir esse endereço
porque não existe nenhum servidor rodando nessa porta na sua máquina.

Isso **não é um bug do código do app**. O app já pede o retorno para o próprio
domínio (`window.location.origin`). Quando o endereço pedido não está na lista
de permissões do Supabase, ele ignora o pedido e usa a **Site URL** do projeto —
que hoje está configurada como `http://localhost:3000`.

## Correção (configuração no Supabase, sem alteração de código)

No painel do Supabase, em **Authentication → URL Configuration**:

1. **Site URL**: trocar `http://localhost:3000` por
   `https://monetisexy.com`
2. **Redirect URLs**: incluir todas as origens usadas:
   - `https://monetisexy.com/**`
   - `https://www.monetisexy.com/**`
   - `https://vibe-pay-studio.lovable.app/**`
   - `https://id-preview--ccce3d77-bfc0-456e-8651-bd8cd55716dd.lovable.app/**`
   - `http://localhost:8080/**` (porta real do ambiente de desenvolvimento)

No **Google Cloud Console**, no cliente OAuth, confirmar que em
**URLs de redirecionamento autorizadas** existe exatamente:

```text
https://zyoxtptkmhugxmdzmptd.supabase.co/auth/v1/callback
```

E remover qualquer entrada apontando para `localhost:3000`.

## Detalhes técnicos

- `signInWithGoogle` em `src/lib/auth.ts` usa
  `redirectTo: window.location.origin`, o que está correto.
- O Supabase só honra `redirectTo` se a URL casar com a allowlist de
  **Redirect URLs**; caso contrário cai na **Site URL**.
- O padrão `/**` cobre qualquer caminho dentro do domínio (inclusive o retorno
  com hash de tokens).

## Verificação

Depois de salvar as configurações: abrir `/entrar`, clicar em
"Continuar com Google" e confirmar que o retorno acontece no domínio do app e a
sessão é criada (usuário cai no feed/onboarding).

Nenhum arquivo do projeto precisa ser alterado. Se após o ajuste o problema
persistir, investigo o fluxo no código.
