## Objetivo

Ligar a página `/account-status` aos dois sinais de presença que já existem no app, deixar o timer funcional, e criar o badge "No chat".

## Como funciona hoje (diagnóstico)

Existem **dois sinais de presença** diferentes rodando em paralelo:

1. **`profiles.last_seen_at`** (banco): atualizado a cada 60s por `touchPresence` enquanto o usuário tem qualquer página autenticada aberta. É lido por `useIsUserOnline` (polling, considera online se <90s) e por `perfil.$username.tsx` para mostrar a badge "Online hoje" + bolinha verde no avatar do perfil.
2. **Canal Realtime `online-users`** (Supabase presence): mantido pelo `usePresenceHeartbeat` no layout autenticado, publica quem está online *agora* via `useOnlineUsers()`. É lido em `/chat` para mostrar a bolinha verde do lado do avatar na lista de conversas.

Ambos são globais — a bolinha verde no chat **não** significa "está dentro do chat", significa apenas "tem alguma aba autenticada aberta". A página `/account-status` hoje só salva a escolha em `localStorage` e **não afeta nenhum dos dois sinais**. O timer nunca é lido.

## O que vamos construir

### 1. Persistência de status (nova tabela `user_status`)

Migration com colunas: `user_id` (PK, FK auth.users), `status` enum (`online` | `offline` | `in_chat`), `clear_after_at` (timestamptz nullable), `updated_at`. RLS: o dono lê/escreve o próprio; leitura pública apenas de `status` (para outros verem o badge). Grants: `authenticated` SELECT/INSERT/UPDATE, `anon` SELECT, `service_role` ALL.

### 2. Server functions em `src/lib/user-status.functions.ts`

- `getMyStatus()` → lê status atual + clear_after; se `clear_after_at` já passou, reseta para `online` e retorna atualizado.
- `setMyStatus({ status, clearAfter })` → grava linha; calcula `clear_after_at` a partir da string (`30m`, `1h`, `4h`, `today`, `week`, `never`).
- `getUsersStatus({ userIds })` → retorna map `{ userId → status }` para consumo no `/chat`.

### 3. Página `/account-status` funcional

- Trocar `localStorage` por `useQuery(getMyStatus)` + mutation `setMyStatus`.
- Pré-selecionar a opção salva ao abrir.
- Após "Definir status", invalidar cache e voltar para `/chat`.
- Manter UI atual (já está pronta).

### 4. Aplicar "Offline = invisível total"

Alterar `usePresenceHeartbeat` para receber o status atual (via query) e:
- **`offline`**: não chama `touchPresence` (não atualiza `last_seen_at`), não faz `channel.track()` (some da lista de online do chat), e chama `untrack()` imediatamente se já estava online. Resultado: bolinha verde e "Online hoje" desaparecem para todos.
- **`online` / `in_chat`**: comportamento atual (heartbeat + track).

### 5. Aplicar "No chat = badge especial"

Em `/chat` (`chat.tsx`), buscar `getUsersStatus` para os participantes das threads. Renderização do indicador ao lado do avatar:
- `in_chat` → ícone azul `MessageCircle` pequeno (mesmo visual do `iconWrap` da página `/account-status`).
- `online` → bolinha verde atual (via `useOnlineUsers()`).
- `offline` → nada.

O badge "No chat" também aparece no header da conversa aberta. Fora do chat (ex: perfil), `in_chat` conta como online normal (bolinha verde + "Online hoje").

### 6. Timer "limpar status após"

- Ao gravar, calcular `clear_after_at = now() + intervalo` (ou `null` se `never`).
- No cliente, `usePresenceHeartbeat` roda um `setTimeout` até `clear_after_at`; ao disparar, chama `setMyStatus({ status: "online", clearAfter: "never" })` e refetch da query.
- No servidor, `getMyStatus` também auto-reseta se o timer expirou entre sessões (fallback quando o cliente estava fechado).

### 7. Bolinha verde em outros locais

`useIsUserOnline` (usado em `/perfil/$username`) passa a considerar offline se o `user_status.status = 'offline'`, mesmo com `last_seen_at` recente — para respeitar invisibilidade. Feito via join simples na query ou uma segunda consulta.

## Detalhes técnicos

```text
Fluxo:
[/account-status] → setMyStatus → user_status
                                     │
                                     ▼
     [usePresenceHeartbeat] ── lê status ──> decide se faz touchPresence + channel.track
                                     │
                                     ▼
     [chat.tsx] ── getUsersStatus ──> escolhe badge (verde | balão | nada)
                                     │
                                     ▼
     [perfil.$username] ── useIsUserOnline (respeita offline) ──> "Online hoje"
```

Enum SQL:
```sql
CREATE TYPE public.user_status_kind AS ENUM ('online','offline','in_chat');
```

Intervalos do timer (em `setMyStatus`):
`30m`→30min, `1h`→1h, `4h`→4h, `today`→fim do dia local do usuário (aproximado como 23:59 UTC do dia atual), `week`→+7 dias, `never`→null.

## Arquivos afetados

- **novo**: `supabase/migrations/<timestamp>_user_status.sql`, `src/lib/user-status.functions.ts`
- **editar**: `src/routes/_authenticated/account-status.tsx`, `src/hooks/usePresenceHeartbeat.ts`, `src/hooks/useIsUserOnline.ts`, `src/routes/_authenticated/chat.tsx`

## Fora do escopo

- Mostrar "digitando…" ou última visualização no chat.
- Status personalizados/emoji (só as 3 opções atuais).
