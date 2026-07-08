# Conectar Supabase externo (manual) — execução

Credenciais recebidas:
- URL: `https://zyoxtptkmhugxmdzmptd.supabase.co`
- Publishable key: `sb_publishable_PEVXVq0z14YVKfZjftzRRA_NSt4WVIX`
- Project ID: `zyoxtptkmhugxmdzmptd`
- Service role: vou solicitar via formulário seguro (`add_secret`)
- Auth: email/senha + Google
- SQL: você roda no SQL Editor
- Escopo do SQL: só o básico (profiles + user_roles/roles)

## Passos

1. **Solicitar service role key** via `add_secret` (`SUPABASE_SERVICE_ROLE_KEY`) — formulário seguro, não colar em chat.
2. **Salvar demais secrets** via `set_secret`:
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
3. **Criar arquivos de integração** (padrão TanStack Start):
   - `src/integrations/supabase/client.ts` — browser (publishable)
   - `src/integrations/supabase/client.server.ts` — admin (service role, server-only)
   - `src/integrations/supabase/auth-middleware.ts` — `requireSupabaseAuth`
   - `src/integrations/supabase/auth-attacher.ts` — anexa Bearer nas server fns
   - `src/integrations/supabase/types.ts` — stub `Database` (sem tabelas ainda)
   - Registrar `attachSupabaseAuth` em `src/start.ts` (append em `functionMiddleware`)
4. **Auth UI**:
   - Rota pública `/auth` com login/signup email+senha e botão Google (via `lovable.auth.signInWithOAuth`)
   - Layout `src/routes/_authenticated/route.tsx` (gate `ssr: false` conforme integração)
   - Listener `onAuthStateChange` em `src/routes/__root.tsx` (filtrado)
5. **Entregar o SQL** para você colar no SQL Editor do Supabase:
   - `profiles` (FK `auth.users`, RLS, trigger `on_auth_user_created`)
   - Enum `app_role` + `user_roles` + `has_role()` security definer
   - GRANTs corretos em ambas
6. **Instruções pra você no dashboard do Supabase**:
   - Auth → Providers → Google: habilitar (client id/secret do Google Cloud)
   - Auth → URL Configuration: adicionar Site URL e Redirect URLs do preview/publicado
7. **Verificar**: após você rodar o SQL, testo signup real e confirmo criação de `auth.users` + `profiles` + `user_roles`.

## O que você precisa ter à mão

- Confirmar `add_secret` do service role quando o formulário abrir.
- Rodar o SQL que eu entregar.
- Configurar Google provider e Redirect URLs no dashboard do Supabase.
