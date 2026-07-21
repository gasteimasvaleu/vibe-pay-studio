## Sistema de Amigos (unilateral, com flag de visibilidade)

### 1. Banco de dados (migração)

Nova tabela `public.friendships`:
- `id uuid pk`
- `owner_id uuid` — quem adicionou (fonte)
- `friend_id uuid` — quem foi adicionado (destino)
- `created_at timestamptz`
- `visible boolean default true` — controlado pelo destino (o "amigo") por linha, caso queira ocultar apenas essa relação; combina com a flag global `profiles.restrict_friendships`
- `unique (owner_id, friend_id)`, `check (owner_id <> friend_id)`
- índices em `owner_id` e `friend_id`

GRANTs para `authenticated` e `service_role`, RLS habilitado.

Políticas RLS:
- SELECT: qualquer autenticado pode ler uma linha se:
  - é o `owner_id` ou `friend_id` (dono da relação), OU
  - `visible = true` E o `friend_id` NÃO tem `profiles.restrict_friendships = true` (visão pública)
- INSERT: `auth.uid() = owner_id` e destino não bloqueou o solicitante via `subscriber_restrictions`/bloqueio (checagem simples).
- UPDATE: apenas o `friend_id` pode alterar `visible` da sua própria linha.
- DELETE: `owner_id` (desfazer) ou `friend_id` (remover-se da lista alheia).

### 2. Server functions (`src/lib/friends.functions.ts`)

- `addFriend({ friendUserId })` — insere linha (idempotente via ON CONFLICT DO NOTHING).
- `removeFriend({ friendUserId })` — deleta onde `owner_id = me`.
- `isFriend({ friendUserId })` → boolean (para estado do botão).
- `listPublicFriends({ userId, limit })` — retorna amigos visíveis do perfil (join em `profiles` para pegar avatar/username/display_name), respeitando `restrict_friendships` do destino e a flag `visible` da linha.
- `listMyIncomingFriends({ limit, cursor })` — para a aba Superfãs: retorna quem me adicionou (`friend_id = me`), com dados do owner + toggle de visibilidade da linha.
- `setFriendshipVisibility({ ownerUserId, visible })` — o destinatário alterna a visibilidade da linha que outro criador criou apontando pra ele.

### 3. UI — Perfil público (`src/routes/_authenticated/perfil.$username.tsx`)

- Substituir o toast do botão "Adicionar amigo" por chamada real a `addFriend`/`removeFriend` com estado (ícone e label alternam entre "Adicionar amigo" e "Remover amigo") via `useQuery(isFriend)`.
- Novo componente `FriendsStrip` renderizado logo abaixo da linha de ícones sociais da bio:
  - Título discreto "Amigos" + contagem
  - Lista horizontal scrollável de avatares circulares (nome abaixo), cada um linkando para `/perfil/$username`
  - Fonte: `listPublicFriends({ userId: profile.userId })`
  - Renderiza somente se `count > 0`
  - Aparece igualmente no perfil do owner e no perfil do friend (por padrão), respeitando `restrict_friendships` global do destino e `visible` da linha
  - Se dono do perfil visitando o próprio → mostra pequeno botão "Gerenciar" que abre a aba Superfãs (para controle de visibilidade)

### 4. UI — Dashboard "Meu Monetisexy" (`src/routes/_authenticated/my-monetisex-stats.tsx`)

- Adicionar nova aba principal **"Superfãs"** em `MAIN_TABS` (após "Assinantes").
- Painel `SuperfasPanel`:
  - Lista de criadores que me adicionaram como amigo (`listMyIncomingFriends`)
  - Cada linha: avatar, @username, display_name, "Amigo desde", link "Ver perfil" e um `Switch` "Mostrar publicamente" (chama `setFriendshipVisibility` para essa linha)
  - Estado vazio com CTA explicativa sobre cross-promotion
  - Busca por nome/username
  - Nota informativa sobre a flag global `restrict_friendships` em Privacidade (com deep-link)

### 5. Integração com privacidade existente

- Manter `profiles.restrict_friendships` (já existe) como "kill switch" global: quando true, `listPublicFriends` NUNCA retorna o usuário como amigo em perfis de terceiros, e o botão "Adicionar amigo" continua oculto no perfil dele.
- A nova coluna `friendships.visible` é ajuste por-relação, independente do global.

### Detalhes técnicos

- Todas as functions usam `requireSupabaseAuth`; consulta pública via `context.supabase` respeitando RLS.
- Cache: `queryKey: ['friends', 'public', userId]` e `['friends', 'incoming']`; invalidar após add/remove/toggle.
- `FriendsStrip` faz `ensureQueryData` no loader do perfil para SSR-friendly (o loader já é `_authenticated`).
- Sem alterações em outras tabelas nem em pagamento.

### Arquivos afetados

- (novo) `supabase/migrations/*_friendships.sql`
- (novo) `src/lib/friends.functions.ts`
- (novo) `src/components/profile/FriendsStrip.tsx`
- `src/routes/_authenticated/perfil.$username.tsx` (botão real + strip)
- `src/routes/_authenticated/my-monetisex-stats.tsx` (aba Superfãs)
