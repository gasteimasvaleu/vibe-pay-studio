## Objetivo

Ligar `/settings/device-management` a sessões reais do Supabase Auth. Substituir os mocks (`CURRENT`, `OTHERS`) por dados vindos de `auth.sessions`, identificar o acesso atual, permitir remover sessões individuais e "Remover todos os acessos".

## Como funciona

O Supabase Auth guarda cada sessão em `auth.sessions` com: `id`, `user_id`, `created_at`, `updated_at`, `refreshed_at`, `user_agent`, `ip`, `not_after`. O JWT do usuário carrega `session_id` no claim — usamos isso pra marcar qual card é "acesso atual". Como `auth.sessions` fica no schema `auth` (só service role acessa), toda leitura/gravação passa por server function.

## Server functions — novo `src/lib/sessions.functions.ts`

Todas com `.middleware([requireSupabaseAuth])`, carregando `supabaseAdmin` dentro do handler:

- `listMySessions()` → lê `auth.sessions` (`context.supabase.rpc` não expõe schema auth; usar `supabaseAdmin.schema('auth').from('sessions').select(...).eq('user_id', context.userId).order('refreshed_at', { ascending: false })`). Retorna array `{ id, userAgent, ip, createdAt, refreshedAt, isCurrent }` — `isCurrent = id === context.claims.session_id`.
- `revokeSession({ sessionId: string })` → valida `sessionId ≠ current` e `user_id = context.userId`, então `supabaseAdmin.schema('auth').from('sessions').delete().eq('id', sessionId).eq('user_id', context.userId)`.
- `revokeAllOtherSessions()` → mesmo `delete` com `.neq('id', context.claims.session_id)`.

Não expor rota "sign out this device" pro card atual — só "Remover todos os outros" fecha as demais sem deslogar o usuário aqui.

## Tela `settings.device-management.index.tsx`

- `loader` chama `listMySessions()` (rota está sob `_authenticated`, ok).
- Split em `current` (isCurrent = true) e `others`.
- Parser simples de `user_agent` → `{ browser: 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Outro', os: 'Windows' | 'macOS' | 'iOS' | 'Android' | 'Linux' | '—' }`. Sem lib externa; regex direto.
- Card mostra: **{browser} em {os}**, IP (em vez de "cidade, UF, BR" — Supabase não faz geolocalização; explicar em texto pequeno "Localização por IP indisponível"), "Ativo em {refreshed_at formatado pt-BR}" e "Entrou em {created_at}".
- Menu de opções por card:
  - Remover **"Renomear"** (Supabase não guarda apelido de sessão; simplificar).
  - Manter **"Remover acesso"** → `AlertDialog` de confirmação → chama `revokeSession` → `toast.success` → `router.invalidate()`.
- Botão "Remover todos os acessos" → `AlertDialog` → `revokeAllOtherSessions()` → `router.invalidate()`.
- "Ver mais" continua mesmo comportamento (paginação client-side sobre `others`).
- Fallback: se `others.length === 0`, mostrar mensagem "Nenhum outro acesso ativo".

## Tela `settings.device-management.removed.tsx`

Supabase não guarda histórico de sessões deletadas. Duas opções:

- **(escolhido)** Manter a página com a mensagem informativa de placeholder que já existe hoje. Sem criar tabela nova nem migração.
- (alternativa não tomada) Criar tabela `revoked_sessions` e inserir uma linha toda vez que revogamos — dá mais peso ao produto mas exige migração + escrita a cada revogação. Se o usuário quiser esse histórico, faço num passo seguinte.

## Sem mudanças

- Sem migração (dados vêm de `auth.sessions`).
- Sem novos secrets — `supabaseAdmin` já usa `APP_SUPABASE_SERVICE_ROLE_KEY`.
- Não vamos fazer geolocalização por IP nesse passo (evita dependência externa/custo). Só IP cru.

## Arquivos

- new  `src/lib/sessions.functions.ts` — 3 server functions autenticadas.
- edit `src/routes/_authenticated/settings.device-management.index.tsx` — loader real, parser de user_agent, AlertDialogs de confirmação, remove "Renomear".
- `settings.device-management.removed.tsx` fica como está.
