## Objetivo

Na aba **Assinaturas** de `/my-monetisex-stats`, remover o grid de 4 StatBoxes (Ativos/Novos/Renovações/Ticket médio) que aparece abaixo do gráfico e substituir pelo bloco do screenshot: **Filtrar por** (Todos / Renovações / Novos assinantes) + **campo de busca** + **tabela** (Nome | Status | Preço | Duração total), com dados reais e estado vazio "Nenhum assinante encontrado."

## Backend — `src/lib/stats.functions.ts`

Adicionar `getAssinantesList({ from, to, filter, q })`:

- `filter`: `"todos" | "renovacoes" | "novos"` (default `todos`)
- `q`: string opcional (busca por username / display_name)
- Lê `subscriptions` do `creator_id = userId` no período (mesma janela do gráfico), campos: `id, subscriber_id, status, price_cents_paid, started_at, current_period_end, created_at`.
- Deriva `isRenewal` reutilizando exatamente a lógica de `getAssinantesStats` (histórico do subscriber_id antes de `data.from` OU já visto no próprio período).
- Deriva `statusLabel`:
  - `"Ativo"` se `status === "active"` e `current_period_end > now`
  - `"Expirado"` caso contrário
- Deriva `durationDays`: `ceil((min(current_period_end, now) - started_at) / 86400000)` — mostrado como `X dias` (ou `1 mês`, `N meses` quando >= 30d, para casar com o padrão do app).
- Enriquecer com `profiles (user_id, username, display_name, avatar_url)` via `.in("user_id", [...])`.
- Aplica filtro `filter` no server; aplica busca `q` (case-insensitive em `username` + `display_name`) no server.
- Retorna array ordenado por `started_at` desc, limitado a 200:

```ts
Array<{
  id: string;
  subscriberId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  statusLabel: "Ativo" | "Expirado";
  priceCents: number;
  durationDays: number;
  isRenewal: boolean;
  startedAt: string;
}>
```

## UI — `src/routes/_authenticated/my-monetisex-stats.tsx`

1. **Remover** o `<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">` (linhas 1501–1506) com as 4 StatBoxes. `StatBox` fica sem uso — remover também.
2. **Adicionar** novo componente `AssinantesListInline({ range })` no lugar, dentro da mesma coluna esquerda (`space-y-5` já existente), acima do gráfico? Não — abaixo, no mesmo slot onde estavam as StatBoxes, para preservar hierarquia (título/gráfico primeiro).
3. Estrutura do componente (renderiza card `rounded-2xl border border-border bg-card p-5`):
   - Título **Filtrar por** (`text-sm font-bold`)
   - Chips **Todos / Renovações / Novos assinantes** (reutilizando o `Chip` já usado em `TopAssinantesInline`), estado local `filter`
   - `Input` com ícone `Search` — placeholder `"Pesquisar assinantes..."`, com `useState` + `useDeferredValue` (300ms via `setTimeout`) para não spamar server
   - Tabela responsiva:
     - Cabeçalho: `Nome` (col-span-2 no mobile → col unico) · `Status` · `Preço` · `Duração total`
     - Cada linha: avatar + `displayName || @username`; badge de status (verde `bg-emerald-500/10 text-emerald-600` p/ Ativo, cinza p/ Expirado); preço em BRL (`formatBRL(priceCents)`); duração formatada
   - Vazio: `"Nenhum assinante encontrado."` centralizado
   - Loading: 4 `Skeleton` linhas
4. Query: `useQuery(["stats","assinantesList",range.from,range.to,filter,debouncedQ], () => fn({ data: { from,to,filter,q } }))`, `staleTime: 30_000`.
5. Sem alterações no gráfico, sem alterações em outras abas.

## Arquivos alterados

- `src/lib/stats.functions.ts` — adicionar `getAssinantesList`.
- `src/routes/_authenticated/my-monetisex-stats.tsx` — remover StatBoxes, remover `StatBox`, adicionar `AssinantesListInline` + import de `getAssinantesList`.

Sem migração, sem mudanças no schema.
