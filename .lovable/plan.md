## Estado atual da `/colecoes`

Auditando o código real hoje na página:

| Aba | Funciona? | Observação |
|---|---|---|
| FAVORITOS | Sim | Lê `publication_bookmarks` via `listMyBookmarks`. |
| MINHAS COMPRAS | Sim | Lê `publication_unlocks` pagas via `listMyPurchases`. |
| COMPRAS CHAT | Sim | Lê `chat_message_unlocks` pagas via `listMyChatPurchases`. |
| MIMOS | Sim | Lê `tips` enviadas via `listMyTipsSent`. |
| REEMBOLSOS | Sim | Fluxo completo (solicitar / listar / cancelar / admin aprovar com estorno Asaas) já implementado no turno anterior. |
| OCULTADOS | **Não** | Mostra apenas `EmptyState` fixo — sem tabela, sem ação, sem listagem. |

Bug adicional identificado: os cards de post apontam para `/post/${publication_id}`, mas **essa rota não existe** no app (só existem `postsarquivados` e `publicacoes-agendadas`). Todos os cliques em posts vão para 404.

## O que este plano entrega

Fechar as duas lacunas para que **todas as abas** tenham funcionalidade real, ponta-a-ponta.

### 1. Aba OCULTADOS (nova funcionalidade)

Padrão semelhante a Instagram/OnlyFans: usuário oculta um post do próprio feed e depois pode reexibir aqui.

- Migração SQL: nova tabela `public.publication_hides` (`user_id`, `publication_id`, `created_at`), com PK composto, GRANTs para `authenticated` + `service_role`, RLS restrita a `auth.uid() = user_id` (select/insert/delete próprios).
- Alterar `src/lib/publications.functions.ts`: filtrar publicações ocultas nas listagens de feed do usuário logado (LEFT JOIN / NOT IN).
- Novo `src/lib/hides.functions.ts` com `hidePublication`, `unhidePublication`, `listMyHiddenPublications` (hidratando capa, autor, tipo — reusando o helper `hydratePublications` de `collections.functions.ts`, exposto/duplicado conforme necessário).
- Adicionar item "Ocultar post" no `PublicationOptionsMenu` chamando `hidePublication` + invalidando queries do feed.
- Em `colecoes.tsx`: substituir o `EmptyState` fixo da aba `ocultados` por lista real com botão **"Reexibir"** por card (chama `unhidePublication`, invalida `["collections", "hidden"]` e `["feed"]`).

### 2. Corrigir navegação dos cards para posts

Rota `/post/$publicationId` não existe. Opções: criar rota ou apontar para o perfil do autor. Escolha: **apontar para o perfil do autor** (`/perfil/$username`), que já existe e é o comportamento esperado (o post fica acessível pelo feed do criador). Sem criar rota nova para não expandir escopo.

- Em `PublicationRow`, remover `pubHref = /post/...`; usar sempre `authorHref` (`/perfil/$username`) como destino. Fallback para `/colecoes` quando não houver username.
- Aplica-se apenas à `colecoes.tsx` — não altera outras telas.

### 3. Verificação

- Rodar linter Supabase após migração.
- Fluxo manual esperado: ocultar post no feed → aparece em `/colecoes` aba OCULTADOS → botão "Reexibir" remove da lista e volta ao feed; clique em qualquer card de compra/favorito/mimo abre perfil do autor; solicitar reembolso continua funcionando.

### Detalhes técnicos

- `publication_hides` chave: `PRIMARY KEY (user_id, publication_id)` para idempotência do "ocultar de novo".
- RLS: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` em todas as policies (select/insert/delete). Sem policy anon.
- Filtragem no feed via subquery `NOT IN (SELECT publication_id FROM publication_hides WHERE user_id = auth.uid())` dentro das server fns já autenticadas.
- Nenhuma alteração em pagamentos, Asaas, admin, ou nas outras abas.