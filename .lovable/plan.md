## Problema

`auth.sessions` do Supabase deleta a linha ao remover uma sessão — não fica histórico. Para essa tela mostrar "acessos removidos" reais, precisamos gravar o registro no momento em que a sessão é revogada.

## Correção

### 1. Migration nova

Criar `public.revoked_sessions`:
- Colunas: `id uuid pk`, `user_id uuid not null`, `session_id uuid not null`, `user_agent text`, `ip text`, `session_created_at timestamptz`, `session_last_active_at timestamptz`, `revoked_at timestamptz default now()`, `revoked_reason text` (`'user'` / `'user_all'`).
- Índice `(user_id, revoked_at desc)`.
- `GRANT SELECT ON public.revoked_sessions TO authenticated`, `GRANT ALL TO service_role`. Sem grant para `anon`.
- RLS habilitada. Policy SELECT: `auth.uid() = user_id`. Sem INSERT/UPDATE/DELETE para authenticated (só as funções `SECURITY DEFINER` escrevem).

Atualizar as funções `SECURITY DEFINER` já existentes:
- `public.revoke_session(p_session_id uuid)`: antes do DELETE, `SELECT` da sessão em `auth.sessions` e `INSERT` em `public.revoked_sessions` com os dados (user_agent, ip, created_at, updated_at/refreshed_at, reason `'user'`). Só insere se o DELETE realmente removeu uma linha do usuário.
- `public.revoke_all_other_sessions()`: `INSERT ... SELECT` para snapshot de todas as outras sessões do usuário com reason `'user_all'`, depois DELETE.

Nova função `public.list_my_revoked_sessions()` — `SECURITY DEFINER`, retorna as linhas da `public.revoked_sessions` do `auth.uid()` ordenadas por `revoked_at desc`, com `GRANT EXECUTE TO authenticated`.

### 2. `src/lib/sessions.functions.ts`

Adicionar:
- `type RevokedSession = { id, sessionId, userAgent, ip, sessionCreatedAt, sessionLastActiveAt, revokedAt, reason }`.
- `listMyRevokedSessions` server fn com `requireSupabaseAuth`, chamando `context.supabase.rpc('list_my_revoked_sessions')` e mapeando para `RevokedSession[]`.

Nenhuma outra mudança nas funções existentes do TS — as gravações passam a acontecer no lado SQL.

### 3. `src/routes/_authenticated/settings.device-management.removed.tsx`

- Remover o `beforeLoad` duplicado (o `_authenticated` já protege).
- Adicionar `loader: () => listMyRevokedSessions()`.
- Reutilizar `parseUA` e `formatDate` de `@/lib/session-format`.
- Reutilizar o mesmo visual de `SessionCard` da tela `device-management.index` (ícone por tipo de dispositivo, `Browser · OS`, IP), mas com labels próprios: "Removido em {formatDate(revokedAt)}", "Entrou em {formatDate(sessionCreatedAt)}", e chip pequeno com "Você removeu" ou "Removido em massa" conforme `reason`.
- Se `list.length === 0`, manter o card informativo atual ("Nenhum acesso removido até agora.").
- Sem ações de "restaurar" (o token já foi invalidado no Supabase).

## Por que assim

- Não há API no Supabase para consultar sessões deletadas. Registrar em `public.revoked_sessions` no momento da revogação é a única fonte confiável.
- As mesmas RPCs `SECURITY DEFINER` que já removem as sessões cuidam do snapshot, então o histórico é sempre consistente com o que o usuário efetivamente removeu (nunca com expirações internas do Supabase).
- Escrita restrita às funções mantém a tabela imune a inserções forjadas pelo cliente.
