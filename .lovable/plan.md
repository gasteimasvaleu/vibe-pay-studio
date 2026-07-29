## Problema

Em `/my-monetisex-stats`, o kind `story_unlock` (desbloqueio de story pago) não está mapeado na UI:

- `KIND_LABEL` e `KIND_COLOR` (src/routes/_authenticated/my-monetisex-stats.tsx, ~L568–585) não incluem `story_unlock` → a tabela "Ganhos por produto" renderiza o texto cru `story_unlock` sem bolinha colorida.
- `PRODUTO_OPTIONS` / `PRODUTO_TO_KIND` (~L902–912) não listam "Story" → não dá para filtrar extrato/gráfico por stories.

## Alterações

Arquivo único: `src/routes/_authenticated/my-monetisex-stats.tsx`

1. Em `KIND_LABEL`, adicionar `story_unlock: "Story"`.
2. Em `KIND_COLOR`, adicionar `story_unlock: "bg-fuchsia-500"` (distinto do rosa do Mimo e do roxo da Assinatura).
3. Em `PRODUTO_OPTIONS`, incluir `"Story"` (posicionado após "Postagem").
4. Em `PRODUTO_TO_KIND`, adicionar `"Story": "story_unlock"`.

## Fora de escopo

- Backend/agregação: `getGanhosPorProduto` já agrupa por `kind` genericamente, então stories já entram na soma — só faltava a UI reconhecer o kind. Verificar via leitura rápida de `src/lib/stats.functions.ts` antes de editar, mas não modificar.
