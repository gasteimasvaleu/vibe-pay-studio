## Objetivo

`/follow` (título "Meus assinantes") atualmente é estático — sempre mostra "Sem resultados para sua pesquisa.". Substituir pelo listagem real dos assinantes ativos do criador logado, com busca funcional.

## Backend — `src/lib/monetization.functions.ts`

Adicionar `listMySubscribers()` (server fn autenticada, `GET`):
- `supabase.from("subscriptions").select("id, subscriber_id, plan, price_cents_paid, started_at, current_period_end, status").eq("creator_id", userId).eq("status", "active").order("started_at", { ascending: false })`
- Enriquecer com `profiles (user_id, username, display_name, avatar_url)` via `.in("user_id", [...])`.
- Retorna:
  ```ts
  Array<{
    id: string;
    subscriberId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    plan: string;
    priceCents: number;
    startedAt: string;
    currentPeriodEnd: string | null;
  }>
  ```

## UI — `src/routes/_authenticated/follow.tsx`

- Loader: `context.queryClient.ensureQueryData({ queryKey: ["mySubscribers"], queryFn: () => listMySubscribers() })`.
- Componente:
  - `useSuspenseQuery` para carregar lista.
  - `query` state (mantido) + `useDeferredValue` para filtrar client-side por `username` ou `displayName` (case-insensitive).
  - Renderiza cada assinante como linha clicável: avatar (fallback com inicial) + `displayName || @username` + `@username` em segunda linha. Clique navega para `/perfil/$username` quando `username` existir.
  - Estados:
    - `Skeleton` (via `pendingComponent`/Suspense boundary do route)
    - Vazio geral: "Você ainda não tem assinantes."
    - Vazio de busca: "Sem resultados para sua pesquisa." (texto atual)
  - Contador `N assinante(s)` sob a busca quando lista não vazia.
- Adicionar `errorComponent` e `notFoundComponent` no route (obrigatório para rotas com loader).

## Arquivos alterados

- `src/lib/monetization.functions.ts` — adicionar `listMySubscribers`.
- `src/routes/_authenticated/follow.tsx` — trocar por render dinâmico com query + filtro + navegação.

Sem migração.
