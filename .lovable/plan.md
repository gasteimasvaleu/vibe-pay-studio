## Causa raiz
`usePresenceHeartbeat` (layout `_authenticated`) faz `supabase.channel("online-users").subscribe()`. Depois `src/routes/_authenticated/chat.tsx` chama `supabase.channel("online-users")` e adiciona `.on("presence", ...)` — supabase-js retorna a MESMA instância já inscrita, e registrar callback pós-`subscribe()` lança:
`cannot add presence callbacks for realtime:online-users after subscribe()`
Isso quebra o render e cai no `errorComponent` ("This page didn't load").

## Correção
Centralizar leitura de presença no próprio hook global e expor um `useOnlineUsers()`.

### 1. `src/hooks/usePresenceHeartbeat.ts`
- Adicionar store no escopo do módulo:
  - `Set<string>` de userIds online + lista de listeners.
  - `subscribeOnlineUsers(cb)` / `getOnlineUsersSnapshot()`.
- No `start()`, ANTES de `channel.subscribe(...)`, registrar:
  - `channel.on("presence", { event: "sync" }, () => setFromState(channel.presenceState()))`.
- No cleanup do efeito, limpar o Set (`setStore(new Set())`).
- Exportar `export function useOnlineUsers(): Set<string>` usando `useSyncExternalStore(subscribeOnlineUsers, getOnlineUsersSnapshot, getOnlineUsersSnapshot)`.

### 2. `src/routes/_authenticated/chat.tsx`
- Remover `const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());` (linha 70).
- Remover o `useEffect` que cria `supabase.channel("online-users")` (linhas 113-128).
- Adicionar `const onlineUsers = useOnlineUsers();` no lugar.

### 3. Auditoria
- `rg "channel\\(\"online-users\"\\)"` para garantir que nenhum outro componente crie um canal duplicado com o mesmo tópico. Se `useIsUserOnline` ou similar duplicar, migrar para `useOnlineUsers()` no mesmo passo.

Escopo restrito à correção — sem alterações de UI ou lógica de chat.
