## Assinantes restritos — funcionalidade real

### Como a restrição funciona (regras)

Ao restringir um assinante, o creator (dono do perfil) sinaliza no banco que aquele usuário está silenciado para ele. Efeitos:

1. **Chat** — mensagens novas enviadas pelo assinante restrito não aparecem para o creator (filtradas em `listThreads` e `listMessages`). O creator continua vendo o histórico anterior apenas se quiser; por padrão a thread some da caixa. O assinante NÃO é notificado (ele continua vendo a conversa normalmente do lado dele; sua mensagem é aceita mas invisível para o creator).
2. **Comentários** — comentários do assinante restrito nas publicações do creator ficam ocultos para o creator e para os demais visitantes (policy de SELECT), sem avisar o autor.
3. **Assinatura** — permanece ativa (não cancela nem estorna). A restrição é reversível a qualquer momento.
4. **Sem notificação** — nenhum evento/email é disparado para o assinante restrito.

### Onde o creator pode restringir

- No header do chat individual (`/chat/$threadId`) — menu com "Restringir assinante".
- Na própria página `/settings/restrictions` — botão "Restringir assinante" abre dialog com busca por @username entre os assinantes ativos (query em `subscriptions` + `profiles`).

### Como aparecem na página

Lista de cards com avatar, nome de exibição, `@username` e botão "Desrestringir" (ação imediata com `toast` de confirmação). Empty state mantido quando a lista está vazia. Header ganha botão "＋" para adicionar restrição via busca.

---

### Implementação técnica

**1. Migration** — nova tabela `public.subscriber_restrictions`:
- `creator_id uuid` (referencia `auth.users`, não FK), `subscriber_id uuid`, `created_at timestamptz default now()`.
- PK composta `(creator_id, subscriber_id)`, check `creator_id <> subscriber_id`.
- GRANT `SELECT, INSERT, DELETE` para `authenticated`; `ALL` para `service_role`.
- RLS: creator (`auth.uid() = creator_id`) faz SELECT/INSERT/DELETE das próprias.
- Função `SECURITY DEFINER` `public.is_restricted(_creator uuid, _subscriber uuid) returns boolean`.
- Atualizar policies:
  - `chat_messages` SELECT: adicionar `AND NOT (auth.uid() <> sender_id AND public.is_restricted(auth.uid(), sender_id))` — o creator não vê msgs de restritos; o assinante ainda vê as próprias.
  - `publication_comments` SELECT: adicionar `AND NOT public.is_restricted(<author da publication>, comments.author_id)`. Como o autor da publication varia por linha, usa subquery: `NOT EXISTS (SELECT 1 FROM public.publications p JOIN public.subscriber_restrictions r ON r.creator_id = p.author_id AND r.subscriber_id = publication_comments.author_id WHERE p.id = publication_comments.publication_id)`.

**2. Server functions** (`src/lib/restrictions.functions.ts`, com `requireSupabaseAuth`):
- `listRestrictedSubscribers()` → `Array<{ userId, username, displayName, avatarUrl, restrictedAt }>` (join com `profiles`).
- `restrictSubscriber({ subscriberId })` → valida que existe assinatura ativa (opcional, aceita qualquer user) e faz upsert.
- `unrestrictSubscriber({ subscriberId })` → delete.
- `searchSubscribersToRestrict({ q })` → lista assinantes ativos do creator filtrando por `username ILIKE %q%`, excluindo já restritos.

**3. UI — `src/routes/_authenticated/settings.restrictions.tsx`**:
- Substituir empty state estático por `useQuery(listRestrictedSubscribers)`.
- Renderizar lista de `RestrictedRow` (avatar, nome, @username, botão "Desrestringir" com `useMutation`, invalidação de query e `toast`).
- Empty state atual quando a lista está vazia.
- Header: botão "＋" que abre `AddRestrictionDialog` com input de busca (debounced) usando `searchSubscribersToRestrict`; ao clicar num resultado, dispara `restrictSubscriber` + invalidação + fecha dialog.
- Dialog "Info" existente mantido.

**4. Integração no chat** — em `src/routes/_authenticated/chat.$threadId.tsx`, adicionar botão de menu no header ("Restringir/Desrestringir assinante") que chama as mesmas mutations. Filtro de mensagens vindas de restritos já será garantido pela RLS, então nenhum ajuste em `listMessages` é necessário.

**5. Sem alterações** em: emails, transactions, subscriptions (mantidas ativas), notificações. Restrição é 100% reversível.
