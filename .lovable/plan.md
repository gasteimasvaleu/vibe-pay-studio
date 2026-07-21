## Situação atual

A página `/settings/muted` é 100% estática — só exibe "Você ainda não silenciou nenhum perfil" e um dialog explicativo. Não existe nenhuma tabela, função ou botão de silenciar no app. O chat tem o chip de filtro "Silenciados", mas ele também não faz nada porque não há dados por trás.

Ou seja: **não tem funcionalidade real. Precisa ser construída do zero.**

## O que vou implementar

### 1. Banco (migração)
Tabela `public.muted_profiles`:
- `muter_id` (dono da ação) + `muted_id` (perfil silenciado)
- unique(muter_id, muted_id)
- RLS: só o próprio `muter_id` lê/insere/deleta
- Função `is_muted(muter, target)` (SECURITY DEFINER) para uso em filtros

### 2. Server functions (`src/lib/mutes.functions.ts`)
- `listMuted()` → perfis que você silenciou (avatar, username, displayName, data)
- `muteProfile({ userId })`
- `unmuteProfile({ userId })`
- `isMuted({ userId })` (para o menu do perfil trocar entre "Silenciar" / "Deixar de silenciar")

### 3. UI da página `/settings/muted`
Substituir o texto vazio por:
- Lista real de perfis silenciados (avatar + @username + botão "Deixar de silenciar")
- Busca simples
- Estado vazio mantido quando não houver ninguém
- Dialog "Info" preservado

### 4. Entradas para silenciar
Adicionar no menu "⋯" do perfil público (`perfil.$username.tsx`) uma opção **Silenciar / Deixar de silenciar**, ao lado das opções de amigo/restringir já existentes.

### 5. Integrar com o chat
- `listThreads` passa a marcar cada thread com `isMuted: boolean` consultando `muted_profiles`
- No `chat.tsx`: threads silenciadas não geram badge de "não lidas" e são escondidas da lista principal, **a menos que** o filtro "Silenciados" esteja ativo — aí a lista mostra somente as silenciadas (comportamento que o dialog da página já promete)
- Nenhuma notificação (push/e-mail) é disparada para mensagens de perfis silenciados

### 6. Comportamento e privacidade
- Silenciar é privado: o outro usuário nunca é avisado
- Silenciar ≠ restringir (que já existe em `subscriber_restrictions` e bloqueia interações). Silenciar só afeta **seu lado** (notificações + posição na lista de chat). Vou deixar isso explícito no dialog de info.

## Detalhes técnicos

- Migração segue o padrão do projeto: CREATE TABLE → GRANT (authenticated, service_role) → ENABLE RLS → POLICIES → trigger `updated_at`.
- Server functions usam `requireSupabaseAuth` (contexto `userId` + `supabase` respeitando RLS).
- `listThreads` em `src/lib/chat.functions.ts` ganha um LEFT JOIN lógico (segunda query em batch) para preencher `isMuted` sem quebrar o shape atual.
- Frontend usa `useQuery` + `useMutation` no padrão já adotado nas outras telas de settings (ex.: `settings.restrictions.tsx`).

## Fora de escopo

- Silenciar temporário (1h/8h/1 semana) — só liga/desliga por enquanto.
- Silenciar comentários de posts (essa página é sobre perfis/mensagens).
