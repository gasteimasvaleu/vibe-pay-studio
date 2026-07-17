## Objetivo

Na aba **Top assinantes** de `/my-monetisex-stats`, substituir o layout atual (uma única lista `TopAssinantesInline` em grid) pelo layout do screenshot: **coluna esquerda** com "Filtrar por" (Total/Assinaturas/Mimos/Chat) + tabela `Nome | Gasto total`; **coluna direita** com card **Resumo** (Assinantes, Assinaturas/Renovações, Ganhos de assinaturas) + o card **Top assinantes** existente. Todos os dados reais, para cada subaba.

## UI — `src/routes/_authenticated/my-monetisex-stats.tsx`

Substituir o render do branch `tab === "Top assinantes"` (linha 1511-1512) por um novo layout `grid grid-cols-1 md:grid-cols-3 gap-5`:

**Coluna esquerda (`md:col-span-2`)** — novo componente `TopAssinantesGastoTotal`:
- Card `rounded-2xl border bg-card p-5`
- Título `Filtrar por` (`text-sm font-bold`)
- Chips reaproveitando `TOP_ASSINANTES_CHIPS` (`Total / Assinaturas / Mimos / Chat`) — estado local próprio (independente do chip do card de Top à direita, para casar com o screenshot que mostra dois blocos de filtros distintos).
- Reusa a mesma query `getTopAssinantes({ metric })` (já existe no arquivo) — sem nova server fn.
- Tabela `Nome | Gasto total`:
  - Header: `Nome` (esquerda) · `Gasto total` (direita), `text-xs font-semibold text-muted-foreground`, borda inferior
  - Linhas: avatar + `displayName || @username` · valor `formatBRL(gross)` alinhado à direita
  - Loading: 4 `Skeleton`
  - Vazio: `"Sem dados para este filtro"` centralizado

**Coluna direita (`space-y-5`)**:
1. Novo componente `ResumoAssinantesCard` (usa `getAssinantesStats` já buscado no `AssinantesPanel` — passar `stats.data` e `stats.isLoading` como props):
   - Card com título `Resumo` (`text-base font-bold`)
   - Grid 2 colunas, cada item com ícone circular à esquerda (`h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary`) + label + valor
     - `Users` — "Assinantes" — `stats.data.novosPeriodo + stats.data.renovacoesPeriodo`
     - `UserPlus` — "Assinaturas/Renovações" — `${novosPeriodo} / ${renovacoesPeriodo}`
     - `DollarSign` — "Ganhos de assinaturas" — `formatBRL(faturamentoPeriodo)`
2. `TopAssinantesInline` existente (mantido, sem `full`) — recebe `top`, `loading`, `filtro`, `onFiltro` já existentes.

## Estado / dados

- `AssinantesPanel` (linha 1429): adicionar `const [gastoFiltro, setGastoFiltro] = useState<(typeof TOP_ASSINANTES_CHIPS)[number]>("Total")` e um segundo `useQuery(["stats","topAssinantesGasto",range.from,range.to,gastoFiltro], () => topFn({ data: { ...range, metric: TOP_METRIC_MAP[gastoFiltro] } }))` — reusa a mesma server fn.
- `stats` (via `getAssinantesStats`, já buscado) fornece os números do Resumo.
- Sem nova server fn, sem migração.

## Arquivos alterados

- `src/routes/_authenticated/my-monetisex-stats.tsx` — refatorar o branch `Top assinantes` do `AssinantesPanel`, adicionar `TopAssinantesGastoTotal` e `ResumoAssinantesCard`.
