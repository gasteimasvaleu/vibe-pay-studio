## Objetivo

Separar "seguir" de "assinar". Seguir é gratuito e independente; assinar continua sendo pago (ou grátis quando o criador é gratuito) e dá acesso ao conteúdo pago. O feed passa a mostrar publicações de quem o usuário segue — bloqueadas quando forem pagas e não houver assinatura ativa.

## Mudanças

### 1. Banco de dados (migration)

Nova tabela `public.follows`:

```text
follows(
  follower_id uuid  -> auth.users
  followee_id uuid  -> auth.users
  created_at timestamptz default now()
  PK (follower_id, followee_id)
  CHECK (follower_id <> followee_id)
)
```

- GRANTs: `SELECT, INSERT, DELETE` para `authenticated`; `ALL` para `service_role`.
- RLS habilitada. Políticas:
  - SELECT: `auth.uid() = follower_id OR auth.uid() = followee_id` (usuário vê o que segue e quem o segue).
  - INSERT: `auth.uid() = follower_id`.
  - DELETE: `auth.uid() = follower_id`.
- Índice em `(follower_id)` e `(followee_id)`.

Assinar não cria follow automaticamente e cancelar assinatura não remove follow (são independentes).

### 2. Server functions (`src/lib/monetization.functions.ts`)

Substituir a lógica atual de "follow = subscription grátis":

- `followCreator({ creatorId })` — insere em `follows` (upsert idempotente). Removido o caminho que criava `subscription` grátis.
- `unfollowCreator({ creatorId })` — apaga a linha de `follows`. Não mexe em `subscriptions`.
- Remover `followCreatorFree` (ou renomear para `followCreator` sem criar subscription).

Assinatura gratuita (quando `price_monthly = 0`) continua sendo uma ação separada que cria `subscription` com `price_cents_paid = 0` — mantida sob outro nome (ex.: `subscribeFree`).

### 3. Feed (`src/lib/publications.functions.ts` → `getFeed`)

Trocar a fonte de `allowedAuthors`:

- Buscar `follows.followee_id` onde `follower_id = currentUserId`.
- `allowedAuthors = [currentUserId, ...followees]`.
- Não filtrar mais por `subscriptions`.
- Bloqueio de conteúdo pago continua funcionando pelas checagens existentes (`price_cents`, `unlockRows`, `subscriptions`) já usadas para decidir se a mídia aparece desbloqueada.

### 4. Popover do perfil (`src/routes/_authenticated/perfil.$username.tsx`)

Reorganizar o item do topo em duas ações independentes (conforme screenshot original):

- **Seguir / Deixar de seguir** (topo): usa `followCreator` / `unfollowCreator`. Estado `isFollowing` vem de `follows`, não de `subscriptions`.
- **Assinatura gratuita / Assinar**: item separado abaixo.
  - `price_monthly === 0` e sem subscription ativa → "Assinatura gratuita" (chama `subscribeFree`).
  - `price_monthly > 0` e sem subscription ativa → "Assinar" (abre `SubscribeDialog`).
  - Com subscription ativa → "Assinado" (desabilitado) ou opção "Cancelar assinatura" (fora de escopo agora — manter só o label desabilitado).

`beforeLoad` do perfil passa a computar:
- `isFollowing`: existe linha em `follows`.
- `isSubscribed`: subscription ativa e não expirada (lógica atual).

### 5. Fora de escopo

- UI de lista de seguidores/seguindo.
- Notificações de novo seguidor.
- Cancelamento de assinatura pelo popover.
- Mudanças em `PublicationOptionsMenu` ou no card do feed (o bloqueio já é tratado lá).

## Detalhes técnicos

- A tabela `follows` é auth-only, sem GRANT para `anon`.
- Nenhuma migration mexe em `subscriptions`; assinaturas "grátis" criadas anteriormente pelo `followCreatorFree` permanecem — não afetam o novo feed porque o filtro passa a ser por `follows`. Se quiser, uma etapa opcional futura pode fazer backfill copiando essas subscriptions grátis para `follows`.
