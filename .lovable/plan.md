## Página Chat (`/chat`) — DMs em tempo real

Nova rota autenticada com layout de duas colunas inspirado no screenshot, adaptado ao tema escuro do app (fundo preto, acentos fúcsia/roxo, vidro/`backdrop-blur`, bordas `white/10`, texto branco/branco-60).

### Layout

```text
┌───────────────────────────────┬──────────────────────────────────┐
│ Conversas   [+] [📅] [⚙] [☰] [👤●] │  (header do parceiro)             │
│ 🔎 Pesquisar usuários…         │                                  │
│ ⬤ Exibir apenas online         │  mensagens (bolhas)              │
│ ─────────────────────────────  │                                  │
│ [avatar] nome     · 12:03      │                                  │
│         última msg…      ●2    │                                  │
│ …                              │  ─────────────────────────────    │
│                                │  [textarea] ................ [➤] │
└───────────────────────────────┴──────────────────────────────────┘
```

- Desktop: sidebar 320px + painel de conversa. Mobile: sidebar full-width em `/chat`, conversa em `/chat/$threadId` (rota real, permite reload).
- Estado vazio central: "Selecione uma conversa" com logo/ícone do app (não Sparkles).
- Bolhas: mensagens do usuário com `bg-gradient-to-br from-fuchsia-500 to-purple-600` + texto branco; mensagens do parceiro com `bg-white/5` + texto branco, borda `white/10`.
- Ícones do header (novo chat, agenda, config, filtro, presença) usando `lucide-react` — funcionais apenas: **novo chat** (abre busca de usuários) e **filtro online**. Os demais ficam como placeholders visuais para não expandir escopo.

### Rotas

- `src/routes/_authenticated/chat.tsx` — layout com sidebar + `<Outlet />`. Em `/chat` (index) mostra estado vazio no painel direito.
- `src/routes/_authenticated/chat.index.tsx` — painel vazio.
- `src/routes/_authenticated/chat.$threadId.tsx` — painel de conversa ativo, lê `threadId` de `useParams`, remonta ao trocar.
- Ícone "Chat" do `BottomNav` passa a apontar para `/chat`.

### Banco (migration)

Tabelas em `public`:

- `chat_threads`: `id`, `user_a`, `user_b` (uuids, ordenados por menor primeiro via trigger para unicidade), `last_message_at`, `created_at`. UNIQUE(`user_a`, `user_b`).
- `chat_messages`: `id`, `thread_id` (FK cascade), `sender_id`, `content` text, `read_at` timestamptz null, `created_at`.
- `user_presence`: `user_id` PK, `last_seen_at`, `is_online` bool. Atualizado pelo cliente (heartbeat).

RLS:
- Threads: SELECT/UPDATE/INSERT permitidos quando `auth.uid() IN (user_a, user_b)`.
- Messages: SELECT quando o usuário participa da thread (via EXISTS); INSERT quando `sender_id = auth.uid()` e participa da thread; UPDATE só para marcar `read_at` do destinatário.
- Presence: SELECT para `authenticated`; UPDATE/INSERT apenas do próprio `user_id`.

Grants completos (`authenticated`, `service_role`), `ENABLE ROW LEVEL SECURITY`, trigger `set_updated_at`/ordenação de participantes, `ALTER PUBLICATION supabase_realtime ADD TABLE` para `chat_messages`, `chat_threads` e `user_presence`.

Helper RPC `get_or_create_thread(other_user uuid)` (security definer) — cria/retorna thread entre `auth.uid()` e `other_user`.

### Server functions (`src/lib/chat.functions.ts`)

- `listThreads()` — retorna threads do usuário com perfil do parceiro (username, avatar), última mensagem, contagem de não lidas, presença.
- `searchUsers(query)` — busca em `profiles` por `username ILIKE`, excluindo o próprio usuário.
- `openThreadWith(userId)` — chama `get_or_create_thread`, retorna `threadId` para navegação.
- `getMessages(threadId)` — lista mensagens ordenadas.
- `sendMessage(threadId, content)` — insere mensagem, atualiza `last_message_at` da thread.
- `markThreadRead(threadId)` — marca mensagens do parceiro como lidas.

Todas com `.middleware([requireSupabaseAuth])`.

### Realtime (client-side, dentro de `useEffect`)

- Em `chat.$threadId.tsx`: canal `messages:{threadId}` escutando `INSERT` em `chat_messages` filtrado por `thread_id=eq.{threadId}` → `queryClient.setQueryData` para anexar. Também dispara `markThreadRead`.
- Em `chat.tsx` (sidebar): canal `threads:{userId}` escutando `INSERT/UPDATE` em `chat_threads` onde o usuário participa → `invalidateQueries(['chat','threads'])`.
- Presença: canal `presence:online` usando `channel.track({ online: true })` do Supabase Realtime Presence. Sidebar filtra pela lista de `user_id`s presentes quando o toggle está ativo.
- Cleanup obrigatório: `supabase.removeChannel(channel)` no retorno do `useEffect`.

### Dados / queries

TanStack Query com `queryOptions` + `ensureQueryData` no loader das rotas:
- `['chat','threads']` na sidebar.
- `['chat','messages', threadId]` no painel.

### Fora de escopo

- Anexos, envio de mídia, chamadas, reações, grupos, notificações push, ícones de agenda/config/filtro avançado (permanecem visuais).
- Bloquear/silenciar usuários.

### Verificação

- `bunx tsgo --noEmit`.
- Migration aprovada e RLS ativo.
- Reload de `/chat/{id}` restaura a conversa.
- Duas sessões: mensagem enviada aparece na outra em tempo real; contagem de não lidas some ao abrir.
