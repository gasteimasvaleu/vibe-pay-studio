## Objetivo
Transformar a rota `/subscriptions` de um mock vazio em uma página funcional que lista os creators/profiles que o usuário logado assina, com filtros, ordenação, busca e ação de ir ao perfil.

## Contexto atual
- A rota está em `src/routes/_authenticated/subscriptions.tsx` e **já é acessível para qualquer usuário logado** (assinante ou creator), pois está sob o layout `_authenticated` sem restrição adicional.
- O componente renderiza `items = []` hardcoded, então sempre aparece estado vazio.
- A tabela `public.subscriptions` já existe com RLS permitindo que o `subscriber_id` veja suas próprias assinaturas.
- Já existe `listMySubscriptions` em `src/lib/monetization.functions.ts`, mas ela retorna apenas `creator_id`, sem dados do perfil do creator.

## Plano de implementação

### 1. Enriquecer a listagem de assinaturas
- Alterar `listMySubscriptions` em `src/lib/monetization.functions.ts` para fazer um join com `public.profiles` e retornar:
  - `id`, `plan`, `price_cents_paid`, `status`, `auto_renew`, `current_period_end`, `started_at`
  - `creatorId`, `creatorUsername`, `creatorDisplayName`, `creatorAvatarUrl`, `creatorAccountType`
- Garantir que a query respeite o limite de 1000 linhas do Supabase e ordene conforme parâmetro futuro (se necessário, ordenação pode ser feita no servidor para evitar inconsistência).

### 2. Carregar dados na rota com o padrão do app
- Criar `queryOptions` para `mySubscriptions`.
- Adicionar `loader` na rota chamando `context.queryClient.ensureQueryData(...)`.
- Usar `useSuspenseQuery` no componente.
- Adicionar `pendingComponent`, `errorComponent` e `notFoundComponent`.

### 3. Implementar filtros e abas com dados reais
- **Aba "Ativas"**: assinaturas com `status = 'active'` OU (`status = 'cancelled'` E `current_period_end > now()`).
- **Aba "Expiradas"**: assinaturas com `status = 'expired'` OU `current_period_end <= now()`.
- **Filtro "Todas / Gratuitas / Pagas"**: baseado em `price_cents_paid` (0 = gratuita, > 0 = paga).
- Aplicar filtros em cascata: tab → filtro de preço → busca textual.

### 4. Implementar ordenação
- "Mais próximo da expiração": `current_period_end ASC`.
- "Mais distante da expiração": `current_period_end DESC`.
- "Nome (A-Z)": `creatorDisplayName || creatorUsername ASC`.
- "Nome (Z-A)": `creatorDisplayName || creatorUsername DESC`.
- Ordenação pode ser feita no servidor dentro da server function para garantir consistência, ou no cliente após o filtro. Recomenda-se servidor.

### 5. Renderizar cards de assinatura
- Avatar do creator (ou inicial).
- Nome de exibição + `@username`.
- Plano (mensal/trimestral/semestral) e valor pago formatado em BRL.
- Badge de status: ativa, cancelada (com acesso até), expirada.
- Data de expiração/renovação.
- Botão "Ir ao perfil" que navega para `/perfil/$username`.

### 6. Adicionar ação de cancelar renovação
- Reutilizar `cancelSubscription` existente em `src/lib/monetization.functions.ts`.
- Mostrar botão "Cancelar renovação" apenas em assinaturas ativas pagas (`status = 'active'` e `price_cents_paid > 0`).
- Após cancelar, invalidar a query para refletir o novo status.

### 7. Estados vazios e UX
- Estado vazio específico por aba: "Você não tem assinaturas ativas" / "Nenhuma assinatura expirada".
- Estado de busca sem resultados.
- Skeleton no `pendingComponent`.

### 8. Padronização visual
- Ajustar o header para `sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur`, alinhado com as outras páginas do app (`/follow`, `/mywallet`, `/banco`, `/vault`).
- Manter botões finos (`h-9`) conforme padrão já estabelecido.

## Arquivos que serão alterados
- `src/lib/monetization.functions.ts` — enriquecer `listMySubscriptions`.
- `src/routes/_authenticated/subscriptions.tsx` — implementar carregamento, filtros, ordenação, cards e ações.

## Não requer
- Nova migração de banco (a tabela e RLS já existem).
- Novos segredos ou conectores.

## Critério de conclusão
- A página `/subscriptions` exibe assinaturas reais do usuário logado.
- Filtros "Ativas / Expiradas", "Todas / Gratuitas / Pagas", busca e ordenação funcionam.
- Cada item permite navegar ao perfil do creator.
- É possível cancelar a renovação de assinaturas ativas pagas.
- Build passa sem erros.