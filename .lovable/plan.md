## Presença global + badge "Online hoje" no perfil

### Backend
- **Migração SQL**: adicionar `last_seen_at timestamptz` em `public.profiles` (index em `last_seen_at desc`). GRANT já existente cobre a coluna.
- **Server function** `touchPresence` em `src/lib/presence.functions.ts` (auth middleware): faz `update profiles set last_seen_at = now() where id = auth.uid()`. Throttle no cliente para no máx. 1 chamada/60s.

### Presença ao vivo (global)
- Novo hook `src/hooks/usePresenceHeartbeat.ts`:
  - Entra no canal Supabase `online-users` com `presence.key = userId` assim que o usuário autentica.
  - Chama `touchPresence()` no mount e depois a cada 60s (via `setInterval`), e também em `visibilitychange → visible`.
  - Em `visibilitychange → hidden` / `pagehide` / unmount: `channel.untrack()` + `removeChannel()` (fica offline instantaneamente para os outros).
- Montar o hook uma única vez em `src/routes/_authenticated/route.tsx`, para valer em todas as rotas logadas (não só `/chat`).
- Remover o `track()` duplicado de `src/routes/_authenticated/chat.tsx` (mantém apenas a leitura do canal para a lista de threads).

### Leitura no perfil
- Novo hook `src/hooks/useIsUserOnline.ts`: assina o canal `online-users` em modo leitura e retorna `boolean` para um `userId`.
- Nova server function `getLastSeen(userId)` em `src/lib/presence.functions.ts` (pública): retorna `last_seen_at` do dono do perfil. Usada via `useQuery` na página de perfil.

### UI — `src/routes/_authenticated/perfil.$username.tsx`
- Bolinha verde (`bg-emerald-500` com `ring-4 ring-background`) sobreposta no canto inferior direito do avatar, **somente** quando `useIsUserOnline(profile.user_id) === true`.
- Badge no cabeçalho da identidade, alinhada à direita do nome:
  - Se online agora **ou** `last_seen_at >= início do dia local do visitante` → renderizar badge verde clara com texto **"Online hoje"** (mesmo estilo do screenshot: `bg-emerald-50 text-emerald-600 border-emerald-300/60`, variantes dark já previstas).
  - Caso contrário: não renderizar nada (não mostrar "offline").

### Regras / privacidade
- Presença só é anunciada para usuários autenticados (já é o caso, canal fica no layout `_authenticated`).
- `last_seen_at` é legível por qualquer autenticado via a server function (necessário para mostrar no perfil público logado). Não expõe timestamp bruto — a função retorna apenas o campo, o cálculo "hoje" é feito no cliente com o fuso do visitante.

### Arquivos
- Novo: `supabase/migrations/<timestamp>_profiles_last_seen.sql`
- Novo: `src/lib/presence.functions.ts` (`touchPresence`, `getLastSeen`)
- Novo: `src/hooks/usePresenceHeartbeat.ts`
- Novo: `src/hooks/useIsUserOnline.ts`
- Editar: `src/routes/_authenticated/route.tsx` (montar heartbeat)
- Editar: `src/routes/_authenticated/chat.tsx` (remover `track` duplicado, manter leitura)
- Editar: `src/routes/_authenticated/perfil.$username.tsx` (bolinha + badge)

### Fora de escopo
- Mostrar "visto por último há X min" quando offline.
- Preferência do usuário para ocultar status online (pode virar follow-up).
