## Problema

Na página `/perfil/$username`, a aba "Postagens" ainda renderiza `MOCK_POSTS` (dados estáticos, sempre bloqueados). Isso faz o usuário ver publicações "trancadas" mesmo depois de ter pago/desbloqueado essas mesmas publicações no feed. O estado real de unlock só é lido em `getFeed`, então o perfil nunca reflete o desbloqueio.

## Correção

Trocar os mocks da aba de posts do perfil por publicações reais do próprio creator, reutilizando o mesmo `PublicationCard` do feed. Assim o cálculo de `locked` passa pela mesma checagem em `publication_unlocks` (`buyer_id = viewer` + `status = 'paid'`) que já funciona no feed.

### 1. Nova server function `getUserPublications` em `src/lib/publications.functions.ts`

- Assinatura: `{ userId: string, limit?: number, cursor?: string }`, protegida por `requireSupabaseAuth`.
- Copia a lógica de `getFeed`, mas filtrando `.eq("author_id", input.userId)`.
- Retorna `{ items: FeedItem[]; nextCursor }` — mesmo shape, para plugar direto no `PublicationCard`.
- Mantém `unlockedSet` a partir de `publication_unlocks` com `buyer_id = context.userId, status = 'paid'`, para que compras feitas no feed apareçam desbloqueadas aqui.
- Inclui posts do próprio dono como desbloqueados (mesmo tratamento `isOwner`).

### 2. Atualizar `src/routes/_authenticated/perfil.$username.tsx`

- Substituir o bloco `<TabsContent value="posts">` (linhas 420–434) que hoje mapeia `MOCK_POSTS` por uma lista real de `PublicationCard`.
- Carregar via `useQuery` (`useServerFn(getUserPublications)`) usando `profile.userId`. Sem SSR loader — mantém o mesmo padrão que o feed usa no cliente.
- Estados: skeleton simples enquanto carrega; mensagem "Este creator ainda não publicou nada." quando `items.length === 0`.
- Reaproveitar `handleUnlock` no mesmo espírito do `feed.tsx`: após desbloquear, chamar `queryClient.invalidateQueries` da chave `["user-publications", userId]` para refletir imediatamente.
- Callback `onComment` pode reutilizar o mesmo `CommentsSheet` já usado no feed (importar e adicionar estado local `commentsFor`).
- Remover `MOCK_POSTS`, `ProfilePost`, `ProfilePostCard` e helpers que só serviam para o mock (mantendo `Stat`, `SocialButton`, `PlanPill` etc. que continuam em uso em outras seções).
- Aba "Mídias" (linhas 436–451): também é mock. Fora de escopo desta correção; deixar como está (ou, opcional, mostrar apenas mídias reais desbloqueadas — decidir depois).

### 3. Fora de escopo

- Nenhuma mudança no schema, RLS, ou nas server functions de pagamento.
- Nenhuma mudança na tela de bloqueio (`CreatorGatedNotFound`).
- Aba "Mídias" continua com mock por enquanto.
- Sem alterações no dashboard, feed, ou fluxo de assinatura.

## Resultado esperado

Ao abrir `/perfil/<creator>` depois de ter desbloqueado uma publicação no feed, a mesma publicação aparece já desbloqueada na aba "Postagens" do perfil, com mídia visível e sem overlay de cadeado.
