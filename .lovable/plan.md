# Configurar Login com Google no Supabase

## Contexto
O usuário já criou as credenciais OAuth no Google Cloud Console (Client ID: `monetisex`, Client Secret: `Caiaco15...`) e precisa saber o que inserir no Supabase para ativar o login com Google.

## Passos

### 1. No Google Cloud Console — confirmar origens e redirect
Antes de colar as credenciais no Supabase, verifique se estes valores estão configurados no cliente OAuth Web que gerou o Client ID `monetisex`:

**Origens JavaScript autorizadas (Authorized JavaScript origins):**
```
https://monetisexy.com
https://www.monetisexy.com
https://vibe-pay-studio.lovable.app
https://project--ccce3d77-bfc0-456e-8651-bd8cd55716dd.lovable.app
http://localhost:8080
```

**URLs de redirecionamento autorizadas (Authorized redirect URIs):**
```
https://zyoxtptkmhugxmdzmptd.supabase.co/auth/v1/callback
```

> O redirect URI acima é o callback padrão do Supabase Auth. Se o dashboard do Supabase mostrar um valor diferente em Authentication → Providers → Google, use exatamente o valor do Supabase.

### 2. No Supabase — inserir as credenciais do Google
Acesse o dashboard do Supabase do projeto `zyoxtptkmhugxmdzmptd`:
https://supabase.com/dashboard/project/zyoxtptkmhugxmdzmptd/auth/providers

Na seção **Google**, preencha:

| Campo no Supabase | Valor a colocar |
|-------------------|-----------------|
| **Client ID (for OAuth)** | `monetisex` |
| **Client Secret (for OAuth)** | `Caiaco15...` (cole o valor completo, não a versão encurtada) |
| **Authorized redirect URI** | `https://zyoxtptkmhugxmdzmptd.supabase.co/auth/v1/callback` (geralmente é exibido somente leitura pelo Supabase) |

Depois de preencher, clique em **Save**.

### 3. No Supabase — configurar URL Configuration
Ainda no dashboard do Supabase, vá em **Authentication → URL Configuration** e certifique-se de que:

- **Site URL** está como o domínio principal do app, por exemplo:
  ```
  https://monetisexy.com
  ```
- **Redirect URLs** inclui os domínios usados pelo app:
  ```
  https://monetisexy.com/*
  https://www.monetisexy.com/*
  https://vibe-pay-studio.lovable.app/*
  https://project--ccce3d77-bfc0-456e-8651-bd8cd55716dd.lovable.app/*
  http://localhost:8080/*
  ```

### 4. Verificar no app
O app já usa o helper `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` em `src/lib/auth.ts` e `src/components/site/LoginCard.tsx`. Após salvar as credenciais no Supabase, o fluxo de "Entrar com Google" deve funcionar nos ambientes listados acima.

## Resultado esperado
Após a configuração, o botão "Entrar com Google" no `/entrar` e no card de login da landing page deve redirecionar o usuário para o consentimento do Google e, em seguida, autenticá-lo no app.

## Links úteis
- SQL Editor: https://supabase.com/dashboard/project/zyoxtptkmhugxmdzmptd/sql/new
- Authentication providers: https://supabase.com/dashboard/project/zyoxtptkmhugxmdzmptd/auth/providers
