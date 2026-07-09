## Objetivo

Criar página de listagem de ofertas em `/promotions`. Botão "Ofertas" do dashboard passa a apontar para ela. Se o criador não tem nenhuma oferta ativa, redireciona para o fluxo de criação (`/promotion`). Layout segue os screenshots, adaptado aos tokens do app (fundo `background`, cartão `card`, gradiente/laranja `primary` no lugar do laranja hardcoded, verde do status via classe utilitária semântica).

## Escopo

### 1. Backend — `src/lib/promotions.functions.ts`
Adicionar duas server functions autenticadas (`requireSupabaseAuth`):
- `listMyPromotions` → retorna ofertas do `creator_id = userId` ordenadas por `created_at desc`, incluindo campo derivado `is_active` (`status='active'` **e** `ends_at > now()`).
- `endPromotion({ id })` → `UPDATE promotions SET status='ended' WHERE id=$1 AND creator_id=userId`.

Não mexer em `createPromotion`.

### 2. Nova rota `src/routes/_authenticated/promotions.tsx` (listagem)
- Loader chama `listMyPromotions` via TanStack Query (`ensureQueryData` + `useSuspenseQuery`).
- Se `promotions.length === 0` → `throw redirect({ to: "/promotion" })` no `beforeLoad`/loader (fluxo de criação).
- Se lista existe mas sem nenhuma `is_active` → mostra a página com tab "Inativas" já selecionada.
- Header igual ao `PromotionShell` (botão voltar → `/dashboard`, título "Ofertas").
- Tabs "Ativas" / "Inativas" (underline laranja no ativo, usando `text-primary` e `border-primary`).
- Cartão de oferta (`rounded-3xl border bg-card p-5`) — colapsado/expandido controlado por estado local:
  - **Colapsado**: nome (bold), linha status (dot verde + "Oferta ativa" ou dot muted + "Oferta encerrada"), "Termina em X dias (DD/MM/YYYY)" calculado de `ends_at`, divisor, "Quantidade de participantes: `subscriptions_used`/`max_subscriptions`", botão outline pill "Encerrar oferta" (só para ativas) que chama `endPromotion` e invalida a query. Chevron `>` no canto.
  - **Expandido**: bloco `bg-muted rounded-2xl` com linhas "Valor original R$X", "Desconto -Y%" (em `text-primary`), "Valor final R$Z"; depois linhas "Oferta: Desconto na assinatura", "Início da campanha: DD/MM/YYYY", "Fim da campanha: DD/MM/YYYY", "Quantidade de participantes: X/Y"; depois botão "Encerrar oferta". Chevron `v`.
- `head()`: título "Ofertas · Monetisex", `noindex`.

### 3. Dashboard — `src/components/dashboard/CreatorDashboard.tsx`
Alterar o `ActionCard` "Ofertas" para `to="/promotions"` (a rota decide entre listagem e criação).

### 4. Ajuste no wizard de criação
No `success` step do `promotion.tsx`, o botão secundário "Ver minhas ofertas" passa a navegar para `/promotions` (hoje vai para `/dashboard`).

## Fora do escopo
- Edição de oferta, "Inativas" além de exibir status encerrado, filtros, paginação.
- Exposição pública das ofertas em outras telas (será tratado depois quando você indicar onde exibir).

## Detalhes técnicos
- Cores: usar apenas tokens (`bg-card`, `text-foreground`, `text-primary`, `bg-muted`, `text-emerald-500` para o dot verde já usado no projeto).
- Data BR: `new Date(ends_at).toLocaleDateString("pt-BR")`; "dias restantes" = `Math.max(0, ceil((ends_at - now)/86400000))`.
- Mutation de encerrar usa `useServerFn` + `queryClient.invalidateQueries` da key `["my-promotions"]`.
- RLS já cobre o `UPDATE` (política própria do criador criada na migration).
