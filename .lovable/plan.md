# Conectar o Supabase manualmente

Como o botão "Connect a project" do Connectors está travado, vamos ignorá-lo e conectar direto pelas credenciais do próprio Supabase — usando a aba **Server / Direct** desse diálogo que você abriu. O projeto é TanStack Start (não Next.js), então não usamos o snippet pronto do Next; pegamos só as chaves e montamos o cliente no padrão do template.

## O que você me manda do Supabase

Na tela **Connect to your project**:

1. Aba **Framework** → troque de "Next.js" para qualquer coisa; o que importa são as chaves. Mais fácil: feche esse diálogo e vá em **Project Settings → API** (ou **Data API**) do Supabase e me mande:
   - **Project URL** (ex.: `https://xxxxx.supabase.co`)
   - **Publishable / anon key** (`sb_publishable_...` ou JWT `eyJ...`)
   - **Service role key** (`sb_secret_...` ou JWT `eyJ...`) — essa é secreta, eu guardo como secret
   - **Project ID** (o `xxxxx` da URL)

2. Aba **Direct** (opcional, só se quiser rodar as migrations agora): me manda a **connection string** (com a senha do banco). Vou usar só para aplicar o SQL inicial; não fica no código.

## O que eu faço depois que você mandar

1. **Registrar secrets** no projeto:
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_ID` (server)
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (browser)

2. **Criar os arquivos de integração** no padrão TanStack Start:
   - `src/integrations/supabase/client.ts` — cliente browser (publishable key)
   - `src/integrations/supabase/client.server.ts` — admin (service role, server-only)
   - `src/integrations/supabase/auth-middleware.ts` — `requireSupabaseAuth` para server functions
   - `src/integrations/supabase/auth-attacher.ts` — anexa Bearer token nas chamadas
   - `src/integrations/supabase/types.ts` — tipos gerados
   - Registrar `attachSupabaseAuth` em `src/start.ts`

3. **Aplicar o SQL inicial** (rodo via connection string, ou te entrego pra colar no SQL Editor do Supabase):
   - `profiles` + trigger `on_auth_user_created`
   - `app_role` enum + `user_roles` + `has_role()` security definer
   - Tabelas do domínio do app (me confirma quais — pelo nome "vibe-pay-studio" imagino pagamentos/clientes/planos, mas me diga o que precisa)
   - RLS + GRANTs em todas

4. **Wire de auth**: página `/auth` (login/signup email+senha + Google via `lovable.auth.signInWithOAuth`) e layout `_authenticated` gate.

5. **Verificar**: rodo signup real, confirmo criação em `auth.users` + `profiles` + `user_roles`, mando print.

## Decisões que preciso de você

- Confirma que quer **email/senha + Google**, ou só email/senha?
- Quais **tabelas de domínio** você já quer nesse primeiro SQL? (me lista, ou digo pra deixar só auth/profiles/roles e a gente cria depois)
- Prefere que eu rode as migrations pela **connection string** que você mandar, ou você mesmo cola o SQL no **SQL Editor** do Supabase?
