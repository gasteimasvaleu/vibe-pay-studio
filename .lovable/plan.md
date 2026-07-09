## `/publisher` — modais, upload, gate de visibilidade e reordenamento

### Padrão visual dos modais (idêntico ao sheet "Selecionar mídia")
- Container `bg-background`, `rounded-2xl`, borda sutil `border-border`.
- Título preto `font-semibold`, `X` circular `bg-muted` no canto superior direito.
- Pills internas `bg-muted` `rounded-full`.
- Botão primário full-width, `rounded-full`, `h-12`, gradiente `from-orange-400 via-orange-500 to-pink-400`.
- `-`/`+` circulares `bg-orange-500 text-white`; `Slider` com trilha `bg-muted` e range/thumb laranja.
- Desktop centralizado `sm:max-w-[420px]`; full-width no mobile.

### 1. Modal "Desbloquear publicação"
Abre ao ligar switch de publicação paga. Valor inicial R$ 14,90, `-`/`+` step R$ 1,00, `Slider` 14,90–2000, legenda "mínimo : R$ 14,90 - máximo : R$ 2.000,00", botão "Avançar" salva `paidPrice`. Fechar sem confirmar desliga o switch.

### 2. Modal "Desafio"
Mesmo padrão. Subtítulo "Valor do desafio". Inicial R$ 50,00, min 50, max 2000, step 1. Salva `challengePrice`.

### 3. Modal "Agendando publicação"
`Tabs` com underline laranja. Aba 1: `Calendar` shadcn pt-BR, dia atual em laranja; aba 2: selects hora/minuto. Data mínima hoje; hora mínima now+15min se for hoje. "Aplicar" salva `scheduledAt` (ISO). Verifica se `Calendar` existe; instala se faltar.

### 4. Toggles sem modal
`expires24h`, `commentsDisabled`, `pinnedToTop`. Combinam livremente.

### 5. Estado consolidado
```
type PublisherState = {
  paid: { enabled: boolean; priceCents: number | null };
  challenge: { enabled: boolean; priceCents: number | null };
  expires24h: boolean;
  schedule: { enabled: boolean; at: string | null };
  commentsDisabled: boolean;
  pinnedToTop: boolean;
};
```
Desligar switch com valor salvo limpa o valor.

### 6. Upload real das mídias
- Bucket existente `criativos` (público) já criado. Manter público por enquanto — arquivos ficam sob prefixo `posts/{user_id}/{post_id}/{uuid}.{ext}`.
- No `StepMedia`, ao selecionar arquivos:
  1. Gerar `id` local + preview via `URL.createObjectURL` (comportamento atual).
  2. Fazer upload em background com `supabase.storage.from("criativos").upload(path, file, { upsert: false })` — path temporário `posts/{user_id}/drafts/{clientId}.{ext}`.
  3. Mostrar spinner sobre a miniatura enquanto sobe; erro → botão para remover/reenviar.
  4. Guardar `storagePath` e `publicUrl` no `MediaItem`.
- Limites: 10 arquivos; imagens ≤ 15 MB, vídeos ≤ 200 MB, tipos `image/*` e `video/*`. Bloqueio no client.
- RLS policies em `storage.objects` (migration):
  - `authenticated` pode `INSERT`/`UPDATE`/`DELETE` apenas onde `bucket_id = 'criativos'` e `(storage.foldername(name))[1] = 'posts'` e `(storage.foldername(name))[2] = auth.uid()::text`.
  - `SELECT` público (bucket já público).
- Botão "Postar" só habilita quando todas as mídias terminarem o upload.

### 7. Backend das publicações (schema + server fn)
Tabelas novas via migration:
- `publications`
  - `id uuid pk default gen_random_uuid()`
  - `author_id uuid not null` (referência lógica a `auth.users`; não FK)
  - `caption text`
  - `visibility text not null default 'public'` (`public` | `paid` | `challenge`)
  - `price_cents int` (nullable)
  - `challenge_cents int` (nullable)
  - `expires_at timestamptz` (para post 24h)
  - `scheduled_at timestamptz`
  - `comments_disabled boolean not null default false`
  - `pinned boolean not null default false`
  - `published_at timestamptz` (null enquanto agendado)
  - `created_at`, `updated_at` (trigger `set_updated_at`)
- `publication_media`
  - `id uuid pk`, `publication_id uuid not null references publications(id) on delete cascade`
  - `storage_path text not null`, `url text not null`
  - `type text not null check (type in ('image','video'))`
  - `position int not null` (ordem)
  - `created_at`
- `publication_unlocks` (compras futuras via Mercado Pago)
  - `id`, `publication_id`, `buyer_id uuid not null`, `amount_cents int not null`, `provider text default 'mercadopago'`, `provider_ref text`, `status text default 'paid'`, `created_at`, único (`publication_id`,`buyer_id`).
- GRANTs padrão + RLS:
  - `publications`: SELECT público para linhas onde `visibility='public'` OU (`visibility in ('paid','challenge')` mas com colunas sensíveis mascaradas — implementado via view `publications_public` com `security_invoker=on` expondo `has_access` calculado por security definer). Autor lê/edita/deleta as próprias.
  - `publication_media`: SELECT segue a mesma regra da publicação-mãe via função `public.can_see_publication(pub_id)` security definer que consulta `publications` + `publication_unlocks` + `auth.uid()`. Autor CRUD nas próprias.
  - `publication_unlocks`: comprador vê os próprios; autor vê os das próprias publicações; INSERT apenas via server fn (RLS bloqueia direto).
- Server fn `createPublication` em `src/lib/publications.functions.ts` (`requireSupabaseAuth`, Zod):
  - Recebe `PublisherState` + `media: { storagePath, url, type }[]`.
  - Insere `publications` + `publication_media` (posição = índice).
  - Move arquivos de `posts/{uid}/drafts/*` para `posts/{uid}/{pubId}/*` (server side com `supabaseAdmin` importado dinamicamente).
  - Se `paid` ou `challenge`: TODO comentado para criar preferência no Mercado Pago; por ora só grava o valor.
  - Retorna `{ ok: true, publicationId }`.
- Server fn `deleteDraftMedia` para limpar arquivos abandonados quando o usuário remove ou cancela.

### 8. Gate de visibilidade no feed
- Criar helper server fn `getFeed` (paginada) que:
  - Filtra `published_at <= now()` (agendadas não aparecem antes da hora).
  - Filtra `expires_at is null or expires_at > now()`.
  - Ordena `pinned desc, published_at desc`.
  - Para cada item usa `can_see_publication(id)` para decidir se retorna as mídias reais ou um placeholder `{ locked: true, price_cents, challenge_cents }`.
- Componente `PublicationCard` no `/feed` renderiza:
  - Estado normal → carrossel de mídia.
  - Estado bloqueado → capa borrada + selo laranja "Desbloquear por R$ X,XX" (paid) ou "Desafio R$ X,XX" (challenge). Clique abre modal de compra (placeholder até integração real).
- Autor sempre vê o próprio conteúdo desbloqueado (via `auth.uid() = author_id` na função).

### 9. Reordenamento de mídia
- Botão "Reordenar" (já existente) abre modo de reorder no `StepMedia`.
- Implementação com `@dnd-kit/core` + `@dnd-kit/sortable` (instalar se não existir).
- Cada miniatura vira `SortableItem`; drag & drop atualiza `media[]`.
- Mesmo comportamento no desktop (drag) e mobile (long-press).
- Ordem final = `position` enviada ao backend.

### 10. Base para Mercado Pago (estrutura, sem integração)
- Colunas `provider` + `provider_ref` em `publication_unlocks`.
- TODO no `createPublication` e no futuro `unlockPublication` para chamar API do Mercado Pago quando o payload chegar.
- Secret `MERCADO_PAGO_ACCESS_TOKEN` NÃO será criado agora (aguardando o usuário).

### Detalhes técnicos
- shadcn: `Dialog`, `Slider`, `Tabs`, `Calendar` (instalar se faltar).
- Formatador BRL: `Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"})`.
- Locale calendário: `date-fns/locale/pt-BR`.
- Reordenação: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (`bun add`).
- Modais ficam no próprio `publisher.tsx`; extrair só se ultrapassar ~600 linhas.

### Arquivos alterados/criados
- `src/routes/_authenticated/publisher.tsx` — modais, upload, reorder.
- `src/routes/_authenticated/feed.tsx` — usar `getFeed` + `PublicationCard`.
- `src/components/feed/PublicationCard.tsx` (novo).
- `src/lib/publications.functions.ts` (novo) — `createPublication`, `getFeed`, `deleteDraftMedia`.
- `src/components/ui/calendar.tsx` (se faltar).
- Migration: tabelas `publications`, `publication_media`, `publication_unlocks`, função `can_see_publication`, view `publications_public`, policies storage.

### Fora de escopo
- Integração real com Mercado Pago (payload pendente).
- UI de "meus desbloqueios" / histórico de compras.
- Notificações de agendamento.

### Validação
- Ligar cada switch abre o modal correspondente; fechar sem confirmar desliga.
- Upload mostra progresso; "Postar" desabilitado até terminar.
- Reordenar altera a ordem visível na etapa 2 e persiste no backend.
- Posts pagos/desafio aparecem bloqueados no feed para não-autores; autor vê tudo.
- Post 24h somem após `expires_at`; agendados só aparecem após `scheduled_at`.
- `bunx tsgo --noEmit` sem erros.
