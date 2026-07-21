## Diagnóstico (confirmado no banco)

Os dois perfis do `caiorobbb@gmail.com` existem:
- `profiles`: `account_type=creator`, `free_profile_enabled=true`, `active_view=creator`, `active_profile_id` → creator_profile pago.
- `creator_profiles`:
  - `kind=paid`, username `monetisex`
  - `kind=free`, username `monetisexy2`, display_name `Monetisexy 2`

Não é estado antigo. A alternância grava corretamente em `active_view` + `active_profile_id`. O problema é de **leitura**: quase todas as superfícies (feed, stories, chat, comentários, tips, follow, subscriptions, header de `/profile/:username`) resolvem a identidade do creator por `profiles.username / avatar_url`, ignorando o `creator_profile` da linha e o `active_profile_id` do usuário logado.

Só `dashboard`, `profile.$username`, `publisher` e `my-monetisex-stats` estão cientes de `active_profile_id`/`creator_profiles`.

## Objetivo

Ao alternar entre perfil pago e gratuito:
1. As **próprias publicações/stories/mensagens** publicadas em cada modo aparecem com o username/nome/avatar do creator_profile daquele modo (feed, stories, chat, comentários, tips).
2. O **header de `/profile/:username`** mostra os dados do creator_profile correspondente à URL, não do `profiles`.
3. **Follow e Subscriptions** listam o creator pela identidade do creator_profile assinado/seguido, não pelo `profiles`.
4. Novas publicações/stories/tips/mensagens/follows criados no modo ativo passam a ser atribuídos ao `active_profile_id` correto no momento da escrita (fechando o gap para o futuro).

## Passos

1. **Fetchers de leitura (server functions)** — trocar o join de identidade de `profiles` para `creator_profiles` pela FK já existente na linha (`creator_profile_id` / equivalente):
   - `publications.functions.ts` (feed, perfil, agendadas, arquivadas)
   - `stories.functions.ts` (carrossel + viewer)
   - `chat.functions.ts` (threads + mensagens: contraparte do creator)
   - `publications` comments (autor quando é creator)
   - `tips.functions.ts` (remetente/destinatário creator)
   - `monetization.functions.ts` → `listMySubscriptions` (já lê profiles; passar a resolver pelo creator_profile assinado)
   - `friends.functions.ts` / `follow` (`listMySubscribers`)
   - `profile.$username` header
   
   Regra: se a linha já referencia `creator_profiles.id`, exibir `creator_profiles.username / display_name / avatar_url` daquela linha. Fallback para `profiles` só quando a linha for anterior à migração 1:N.

2. **Escritas (atribuição no momento da criação)** — garantir que toda escrita usa o `active_profile_id` do momento:
   - publicar publicação, publicar story, enviar mensagem/tip, seguir/curtir. Auditar cada `createServerFn` de escrita e substituir "resolver creator_profile pelo user_id (implícito paid)" por "usar `profiles.active_profile_id` do autor autenticado". Reutilizar helper único.

3. **Invalidations no toggle** — em `setActiveProfileView` o cliente já chama `queryClient.invalidateQueries()`. Adicionar invalidação explícita dos query keys de feed/stories/chat/subscriptions/follow para evitar UI presa em cache.

4. **QA no perfil de teste**: com `caiorobbb@gmail.com` alternar paid↔free e verificar que feed, stories, `/profile/monetisex` vs `/profile/monetisexy2`, chat, tips, follow e subscriptions mostram o nome/avatar correto por linha.

### Fora de escopo

- Não mexer no schema. As FKs `*_creator_profile_id` já existem da refatoração 1:N.
- Não alterar `profiles.username` (identidade da conta continua sendo o username pago).

### Detalhes técnicos

- Padrão de select nos server fns: substituir `profiles!inner(username, display_name, avatar_url)` por `creator_profiles!inner(username, display_name, avatar_url, kind)` usando a FK da própria tabela (publications/stories/tips/subscriptions/follows/chat_threads).
- Onde só existe `creator_id` (user_id) sem FK direta ao creator_profile, resolver via view SQL leve ou join extra em `creator_profiles` filtrando por `active_view` do dono — evitar isso: preferir usar a FK já persistida na linha, que é a fonte da verdade histórica.
- Helper novo `getActiveCreatorProfileId(userId)` reutilizado nas escritas.
