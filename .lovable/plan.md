
## Objetivo
Trocar o card "Olá, @user" no `/feed` por um carrossel horizontal de Stories (estilo Instagram). Primeira bolinha é o avatar do próprio usuário (se creator/free_creator) com um `+` no canto inferior direito para publicar. Assinantes puros só visualizam/desbloqueiam. Stories expiram em 24h. Preço definido por storie.

## Regras de produto (resposta do usuário)
- Duração: 24h a partir de `published_at`.
- Mídia: imagem, vídeo curto (até 60s) ou item do Vault.
- Preço: por storie (0 = grátis; >0 = pago, cada storie desbloqueado individualmente).
- Visibilidade: só creators que o usuário segue e que têm storie ativo (<24h). O próprio usuário sempre aparece primeiro (se puder publicar).
- Quem publica: apenas `account_type` = `creator` ou `free_creator`. Assinantes puros não têm botão `+`.

## Schema (nova migração)

Tabela `public.stories`:
- `id uuid pk default gen_random_uuid()`
- `creator_id uuid not null` (auth user id)
- `creator_profile_id uuid` (fill via trigger `resolve_active_profile`)
- `media_url text not null`, `media_type text not null check in ('image','video')`
- `thumb_url text null` (para vídeo)
- `price_cents int not null default 0`
- `caption text null`
- `published_at timestamptz not null default now()`
- `expires_at timestamptz not null default now() + interval '24 hours'`
- `created_at`, `updated_at`

RLS:
- SELECT: qualquer authenticated pode ler stories não expirados (`expires_at > now()`). Autor vê os próprios sempre.
- INSERT: só quando `auth.uid() = creator_id` E o perfil é `creator`/`free_creator` (checar `profiles.account_type`).
- DELETE: só autor.
- GRANT select, insert, delete para authenticated; ALL para service_role.

Tabela `public.story_unlocks`:
- `id`, `story_id fk`, `buyer_id`, `creator_id`, `creator_profile_id`, `amount_cents`, `provider`, `provider_ref`, `status`, `transaction_id`, `created_at`.
- Unique (`story_id`, `buyer_id`).
- Trigger `story_unlocks_sync_transaction` análogo aos existentes (`publication_unlocks_sync_transaction`) para split e wallet.
- Trigger `story_unlocks_fill_profile` para `creator_profile_id`.

Tabela `public.story_views`:
- `id`, `story_id`, `viewer_id`, `viewed_at`. Unique(`story_id`,`viewer_id`). Para marcar bolinha como "vista".

Função `public.can_see_story(_story_id)` similar a `can_see_publication` (autor OU grátis OU unlock pago).

Extensão em `pay_with_wallet`: adicionar kind `story_unlock` (mesma mecânica de `publication_unlock`, apontando para `stories`).

## Server functions novas (`src/lib/stories.functions.ts`)
- `getFollowedStories()` (auth): retorna lista agrupada por creator — `[{ creator_id, username, avatar_url, is_me, stories: [{id, media_url, media_type, price_cents, unlocked, viewed, published_at}] }]`. Filtra follows + stories ativos + inclui o próprio usuário no topo se creator/free_creator.
- `createStory({ mediaUrl, mediaType, priceCents, caption })` (auth): valida account_type, insere.
- `deleteStory({ id })` (auth).
- `markStoryViewed({ id })` (auth): upsert em story_views.
- `createStoryUnlockPayment({ storyId, method })` (auth): análogo a `createUnlockPayment` em `payments.functions.ts`.

Wallet: reaproveitar `payWithWallet` com `kind:'story_unlock'`.

## UI

Novo componente `src/components/feed/StoriesCarousel.tsx`:
- Renderiza no lugar do card de boas-vindas em `src/routes/_authenticated/feed.tsx`.
- Layout horizontal com scroll (padrão do app já usa `overflow-x-auto` em `EmAltaSection`).
- Cada bolinha: 64px, avatar com anel gradiente rosa/roxo se tem storie não visto; anel cinza se todos vistos; sem anel para "meu perfil sem storie".
- Bolinha do usuário logado (se creator/free_creator) sempre primeira, com badge `+` embaixo à direita. Clique no `+` → abre `PublishStoryDialog`. Clique na própria bolinha (com stories) → abre viewer nos próprios stories.

`src/components/feed/PublishStoryDialog.tsx`:
- Tabs: "Upload" (input file image/video, capture nativa) e "Do Vault" (usa `VaultPickerSheet` já existente para escolher 1 item).
- Campo preço (R$, com preset 0 = grátis).
- Campo caption opcional.
- Botão publicar → upload no bucket `stories` (criar bucket público) → `createStory`.

`src/components/feed/StoryViewer.tsx`:
- Modal fullscreen com progress bars superiores por storie, avança automaticamente (imagens 5s; vídeos = duração).
- Se `price_cents > 0` e não desbloqueado e não é o autor: overlay borrado + botão "Desbloquear por R$X,XX" → abre `PaymentMethodDialog` (mesmo fluxo do feed). Sucesso via wallet ou `PaymentModal` para PIX/cartão.
- Marca `markStoryViewed` ao abrir.
- Autor vê botão de deletar.

## Integração em `feed.tsx`
- Remover a `motion.section` de boas-vindas (linhas ~159-172) e renderizar `<StoriesCarousel />`.
- Manter tudo o resto (feed, modais existentes).

## Storage
- Criar bucket público `stories` via `supabase--storage_create_bucket`.
- Policies padrão de upload autenticado.

## Fora de escopo
- Reações a stories, respostas via DM, highlights/permanentes, analytics detalhados. Podem entrar depois.
- Reembolso automático quando storie expira antes do buyer ver (compra é do desbloqueio, não da janela de visualização).

## Ordem de execução
1. Migração (tabelas + RLS + triggers + função + extensão `pay_with_wallet`).
2. Bucket `stories`.
3. `src/lib/stories.functions.ts`.
4. Componentes `StoriesCarousel`, `PublishStoryDialog`, `StoryViewer`.
5. Substituição no `feed.tsx`.
