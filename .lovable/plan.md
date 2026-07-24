## Problema

Stories não distinguem entre as personas do mesmo dono (creator pago vs creator free):

1. **`publishStory`** (`src/lib/stories.functions.ts:17`) insere na tabela `stories` **sem** `creator_profile_id`. Todo story novo fica sem carimbo de persona.
2. **`getFeedStoryRings`** agrupa stories por `creator_profile_id ?? creator_id`. Como o publish nunca carimba, tudo cai no fallback `creator_id` — as duas personas do mesmo dono aparecem como **um único anel**. Além disso, `follows` é filtrado por `followee_id` (usuário), então seguir só a persona paga já traz stories da persona free do mesmo dono.
3. **`StoryViewer`** (`src/components/feed/StoryViewer.tsx:57`) chama `getCreatorStories` só com `creatorId`, sem `creatorProfileId`. Abrir o anel exibe stories das duas personas misturados.
4. **`deleteStory`** autoriza só por `creator_id`. A persona free logada consegue apagar story publicado pela persona paga do mesmo dono.

## Plano

### 1. Carimbar persona ao publicar (`src/lib/stories.functions.ts`)
- Em `publishStory`, ler `profiles.active_profile_id` do `context.userId` e inserir em `stories.creator_profile_id`. Se `active_profile_id` estiver nulo, resolver o perfil pago padrão via helper existente (`getProfileAndActiveCreator` de `profile-active.server.ts`).
- Validar que o perfil ativo pertence ao usuário e é do tipo `paid` ou `free_creator` antes de inserir — mensagem clara se não for.

### 2. Autorizar delete por persona (`src/lib/stories.functions.ts`)
- Em `deleteStory`, comparar `story.creator_profile_id` com o `active_profile_id` do chamador. Se o story tem persona carimbada e não bate com a ativa, rejeitar com "troque para a persona que publicou este story".

### 3. Segregar rings do feed por persona (`src/lib/stories.functions.ts`)
- Em `getFeedStoryRings`, seguir por persona: buscar `follows.followee_profile_id` (já usado em publicações) e filtrar `stories` por `.in("creator_profile_id", [...])` — não por `creator_id`. Incluir o próprio perfil ativo do chamador.
- Manter a chave de agrupamento por `creator_profile_id` (sem o fallback `creator_id`); stories legados já foram backfillados na migração anterior, então não existe mais registro nulo.

### 4. Segregar viewer por persona (`src/components/feed/StoryViewer.tsx` + `StoriesCarousel.tsx`)
- Propagar `creator_profile_id` do ring aberto até o `StoryViewer` e passar em `getCreatorStories({ data: { creatorId, creatorProfileId } })`.
- Incluir `creator_profile_id` no `queryKey` do `useQuery` para não colidir cache entre personas.

### 5. Verificações finais
- Consulta ao banco confirmando que todos os 2 stories existentes já têm `creator_profile_id` preenchido (backfill anterior).
- `tsgo` para garantir tipos consistentes após adicionar `creatorProfileId` no fluxo do viewer.

## Detalhes técnicos

- Nenhuma migração SQL nova é necessária: coluna `creator_profile_id` já existe em `stories` e todos os registros estão carimbados.
- O helper `resolveCreatorIdentities` / `pickIdentity` já resolve username/avatar corretos por persona — o pipeline visual não muda.
- RLS de `stories` continua permissiva por `creator_id`; a autorização por persona é feita na camada da server function (consistente com `publications`).

## Fora de escopo

- Renomear a coluna ou tornar `creator_profile_id` NOT NULL (pode ser feito depois com confiança, após validar em produção).
- Alterar o layout do `StoriesCarousel` (o pedido é consistência de dados por persona).
