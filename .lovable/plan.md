## Problema

A página `/settings/security-menu` (e também `/settings/device-management`) quebra com o erro `Invalid schema: auth`. Isso vem do PostgREST do Supabase: a Data API só expõe o schema `public`, então `supabaseAdmin.schema("auth").from("sessions")` sempre falha — não importa se é service role. É por isso que o loader lança e o error boundary do TanStack mostra "This page didn't load".

## Correção

Trocar o acesso direto ao schema `auth` por funções Postgres SECURITY DEFINER expostas no schema `public`, que é o padrão suportado e seguro.

### 1. Migration nova

Criar três funções no schema `public`:

- `public.list_my_sessions()` → retorna `id, user_agent, ip, created_at, updated_at, refreshed_at` de `auth.sessions` onde `user_id = auth.uid()`, ordenado por `refreshed_at desc`.
- `public.revoke_session(p_session_id uuid)` → `delete from auth.sessions where id = p_session_id and user_id = auth.uid()`; bloqueia se `p_session_id` for igual ao `session_id` do JWT atual (`auth.jwt() ->> 'session_id'`).
- `public.revoke_all_other_sessions()` → `delete from auth.sessions where user_id = auth.uid() and id <> (auth.jwt() ->> 'session_id')::uuid`.

Todas `SECURITY DEFINER`, `set search_path = public, auth`. `GRANT EXECUTE ... TO authenticated`. Sem `GRANT` para `anon`.

### 2. `src/lib/sessions.functions.ts`

- Remover o helper `authSchema()` e o import dinâmico de `client.server`.
- Usar o cliente autenticado do middleware (`context.supabase`) e chamar as RPCs:
  - `listMySessions` → `context.supabase.rpc('list_my_sessions')`, mapear para `DeviceSession[]` (marcar `isCurrent` com `claims.session_id`).
  - `revokeSession` → `context.supabase.rpc('revoke_session', { p_session_id })`.
  - `revokeAllOtherSessions` → `context.supabase.rpc('revoke_all_other_sessions')`.
- Manter a mesma forma de retorno (`DeviceSession`) para não mexer nas telas.

### 3. Sem mudanças de UI

`settings.security-menu.tsx` e `settings.device-management.index.tsx` continuam iguais — o contrato do `DeviceSession[]` não muda.

## Por que assim

- PostgREST não expõe `auth` schema — expor seria um risco. Funções `SECURITY DEFINER` no `public` são o caminho recomendado pela Supabase para tocar em `auth.sessions`.
- Como a checagem usa `auth.uid()` e `auth.jwt() ->> 'session_id'` dentro da função, o usuário só consegue listar/remover as próprias sessões, e nunca a sessão atual pelo endpoint individual.
- Elimina a necessidade de `supabaseAdmin` nesse fluxo.
