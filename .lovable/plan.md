
## Escopo

Implementar as três frentes que restaram do Desafio:

1. Persistir as faixas do desafio no banco.
2. Fluxo de contribuição via Pix por faixa (Asaas), reaproveitando `publication_unlocks` para dar acesso ao contribuinte.
3. Tela pública do desafio com barra de progresso da meta.

Sem cartão de crédito, sem carteira interna (não reembolsáveis), sem alterar o esquema de `publications` (já tem `visibility='challenge'` e `challenge_cents` como meta).

## 1. Banco (migration)

Nova tabela `public.publication_challenge_tiers`:

- `id uuid pk default gen_random_uuid()`
- `publication_id uuid not null references publications(id) on delete cascade`
- `amount_cents integer not null check (amount_cents > 0)`
- `position integer not null default 0`
- `created_at timestamptz not null default now()`
- `unique (publication_id, amount_cents)`

Grants: `SELECT` para `anon` e `authenticated` (as faixas são públicas, mesma visibilidade que o card do desafio); `INSERT/UPDATE/DELETE` só para `authenticated`; `ALL` para `service_role`.

RLS:
- `SELECT` permitido para todos (`USING (true)`).
- `INSERT/UPDATE/DELETE` só quando `EXISTS (SELECT 1 FROM publications p WHERE p.id = publication_id AND p.author_id = auth.uid())`.

Índice simples `(publication_id, position)`.

Reaproveitamento do restante:
- Contribuições vão na tabela existente `publication_unlocks` com `amount_cents = valor da faixa`, `provider = 'asaas_pix'` — a trigger `publication_unlocks_sync_transaction` já cria a transação de kind `publication_unlock`, credita a wallet do criador via split e evita self-purchase.
- Constraint `UNIQUE(publication_id, buyer_id)` já garante uma contribuição por fã (segunda tentativa é bloqueada) — coerente com "contribuiu, destravou".
- Total arrecadado = `SUM(amount_cents) FILTER (status='paid')` em `publication_unlocks` para a publicação. Nada precisa mudar no schema.

## 2. Backend — persistir faixas

### 2.1 `createPublication` (`src/lib/publications.functions.ts`)

- Ampliar o input schema com `challengeTiersCents: z.array(z.number().int().min(100)).max(8).optional()`.
- Quando `visibility === 'challenge'` e a lista vier populada:
  - inserir em `publication_challenge_tiers` linhas ordenadas por valor com `position = índice`.
  - falha na inserção faz rollback do `publications` já criado (padrão atual do arquivo).

### 2.2 Publisher (`src/routes/_authenticated/publisher.tsx`)

- O payload já envia `challengeTiersCents`; sem mudanças de UI.

### 2.3 Leitura das faixas

Novo server fn `getChallengeTiers({ publicationId }): Array<{ amount_cents, position }>` — usado pela tela pública e pelo checkout. Sem `requireSupabaseAuth`: usa o client servidor publishable (fetch shim para chaves `sb_`) e a política pública de SELECT.

## 3. Contribuição via Pix

### 3.1 Server fn `createChallengeContributionPayment`

Arquivo: `src/lib/payments.functions.ts`.

Input: `{ publicationId: string; tierCents: number }`. Método fixo `PIX` (sem cartão).

Fluxo (espelho de `createUnlockPayment`, com adaptações):

1. Buscar publicação: precisa ter `visibility='challenge'`, `challenge_cents` (meta) > 0 e autor ≠ comprador.
2. Validar que existe uma linha em `publication_challenge_tiers` com `(publication_id, amount_cents=tierCents)`.
3. Bloquear se já existe `publication_unlocks` desse buyer com `status='paid'` para essa publicação.
4. `upsert` em `publication_unlocks` (`insert` novo ou `update` de pendente) com `amount_cents = tierCents`, `provider = 'asaas_pix'`, `status = 'pending'`.
5. Calcular `netCreatorCents` via `computeCreatorNetCents(tierCents, 'PIX')`, criar `Payment` no Asaas com split para o wallet do criador, gravar `provider_ref`.
6. `getPixQrCode` e `recordIntent` (metadata `referenceTable='publication_unlocks'`) — reutiliza o pipeline atual: webhook Asaas e o poller `getPaymentIntentStatus` já reconciliam via `applyPaidIntent` → marca unlock como `paid` → trigger `publication_unlocks_sync_transaction` cria a `transactions` e o gatilho de wallet credita o criador.
7. Retornar `{ paymentIntentId, pixQrCode, pixCopyPaste, invoiceUrl }` para o `PaymentModal` existente.

Nada muda no webhook (`src/routes/api/public/webhooks/asaas.ts`) nem no reconcile — a contribuição é apenas um `publication_unlock` a mais.

### 3.2 Server fn `getChallengeStatus`

`{ publicationId } → { goalCents, raisedCents, contributorCount, myContributionCents | null, reached: boolean }`.

- Server publishable client para os dois primeiros (agregado de `publication_unlocks` com `status='paid'`), autenticado (`requireSupabaseAuth` opcional — usar cliente autenticado se houver bearer) para `myContributionCents`.
- Simplificação: expor uma única fn `getChallengeStatus` com middleware auth e devolver `myContributionCents=null` quando o usuário não contribuiu.

## 4. UI — tela pública do desafio

### 4.1 `ChallengeContributeSheet` (novo)

`src/components/payments/ChallengeContributeSheet.tsx`. Bottom sheet, mesma largura dos outros checkouts.

Conteúdo:
- Header "Aceitar desafio" com X.
- Bloco de meta: "Meta do desafio" `R$ X` e barra de progresso `raised/goal` (usa `Progress` do shadcn). Texto secundário "Arrecadado R$ Y · N contribuições" e badge "Meta atingida — conteúdo liberado" quando `raised ≥ goal`.
- Aviso curto: "Contribuições não são reembolsáveis."
- Lista de faixas (`getChallengeTiers`) como cartões-rádio; cada card mostra `R$ X` grande.
- Botão "Contribuir com Pix · R$ X" (desabilitado até escolher uma faixa). Ao clicar → `createChallengeContributionPayment` → abre `PaymentModal` no fluxo Pix já existente.

Estados de loading e erro tratados via `toast` (`translatePaymentError`).

### 4.2 `PublicationCard` — overlay de desafio

Editar `LockedOverlay` em `src/components/feed/PublicationCard.tsx` para o caso `isChallenge`:

- Ícone Trophy + título "Desafio".
- Meta `R$ X` e barra de progresso pequena com `raised/goal` (usa `challenge_raised_cents` que virá do feed — ver 4.4).
- Texto "N contribuiu(íram) até agora".
- Botão "Aceitar desafio" (mantém).

Quando `raised ≥ goal`: badge "Meta atingida", botão vira "Contribuir mesmo assim".

### 4.3 Integração no feed e no perfil

- `feed.tsx` e `profile.$username.tsx`: quando `handleUnlock` recebe item com `visibility='challenge'`, abre `ChallengeContributeSheet` em vez de `PaymentMethodDialog`. Um novo state `challengeFor: FeedItem | null` guarda o item.
- Após pagamento confirmado (`onPaid` do `PaymentModal`), invalida `["feed"]` e `["challenge-status", publicationId]`.

### 4.4 Feed data — expor progresso

Em `getFeed` e `getUserPublications` (`src/lib/publications.functions.ts`):

- Para os `ids` da página com `visibility='challenge'`, buscar em paralelo `publication_unlocks` (`select publication_id, amount_cents, buyer_id`, `status='paid'`) e agregar por publicação.
- Adicionar em `FeedItem`:
  - `challenge_raised_cents: number | null`
  - `challenge_contributor_count: number | null`

O overlay usa esses campos direto; o sheet ainda chama `getChallengeStatus` para dados frescos + `myContributionCents`.

## 5. Fora de escopo

- Cartão de crédito para contribuições (spec pede só Pix).
- Reembolso/estorno de contribuições (por design, não são reembolsáveis).
- Notificação em massa ao atingir a meta (só a UI atualiza no próximo fetch/realtime).
- Página dedicada `/desafio/$id` — o desafio vive dentro do card da publicação; o sheet cobre a experiência de contribuir.

## Ordem de execução

1. Migration (tabela + grants + RLS + índice).
2. Ampliar `createPublication` para gravar faixas; adicionar `getChallengeTiers` e `getChallengeStatus`.
3. Adicionar agregados `challenge_raised_cents` / `challenge_contributor_count` em `getFeed` e `getUserPublications`, e no tipo `FeedItem`.
4. Criar `createChallengeContributionPayment` em `payments.functions.ts`.
5. Criar `ChallengeContributeSheet`; ajustar `LockedOverlay` no `PublicationCard`.
6. Rotear o `handleUnlock` de `feed.tsx` e do perfil para o novo sheet quando `visibility='challenge'`.
7. Rodar typecheck e validar fluxo via preview (contribuir com valor de teste em ambiente sandbox do Asaas).
