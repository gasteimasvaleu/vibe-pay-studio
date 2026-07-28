## Problema

Na página `/my-monetisex-stats`, aba **Extratos → Faturamento**, o seletor de produto (Live, Desafio, Chat, Postagem, Videochamada, Mimo, Assinatura) não reflete os ganhos do produto escolhido. Dois bugs se combinam:

1. `ExtratoChartCard` (`src/routes/_authenticated/my-monetisex-stats.tsx`, ~L933) monta o gráfico com `useSeries(range)`, que agrega **todos** os kinds. O `kind` selecionado só é usado para calcular o totalizador acima do gráfico; a curva permanece igual em qualquer produto.
2. `getEarningsSeries` e `getEarningsByProduct` em `src/lib/stats.functions.ts` usam a constante `EARNING_KINDS` sem `live_ticket` e `challenge_contribution`. Selecionar Live ou Desafio devolve zero mesmo quando existem transações — inclusive nos cards de "Ganhos por produto".

## Correção

### 1. Backend — incluir Live/Desafio e aceitar filtro por kind

`src/lib/stats.functions.ts`:
- Ampliar `EARNING_KINDS` adicionando `"live_ticket"` e `"challenge_contribution"`, para que ambas as funções (`getEarningsSeries`, `getEarningsByProduct`, e demais consumidores) considerem essas receitas.
- Em `getEarningsSeries`, aceitar um `kind` opcional no input validator. Quando informado, aplicar `.eq("kind", kind)` na query; caso contrário, manter o `.in("kind", EARNING_KINDS)` atual. Retorno permanece igual.

### 2. Frontend — propagar o kind para a série

`src/routes/_authenticated/my-monetisex-stats.tsx`:
- Estender `useSeries` para aceitar `kind: string | null` opcional, incluindo o kind na `queryKey` e no payload.
- Em `ExtratoChartCard`, chamar `useSeries(range, kind)` para que a curva reflita apenas o produto selecionado. Nos demais chamadores (ex.: `EarningsChartCard`, `GanhosPorProdutoChartCard`), continuar sem `kind` — comportamento agregado inalterado.

### Escopo fora

- Não mudar UI/labels/cores do gráfico ou dos cards.
- Não alterar `ExtratoTable` (já filtra por kind no cliente) nem os cards da coluna lateral.
- Sem migrações.
