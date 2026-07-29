## Diagnóstico

Consulta ao banco confirmou: existem **3 linhas** em `subscriptions` para `monetisexy`, mas todas do **mesmo `subscriber_id`** (`3fc0cc8a…`):

| status | price | created_at |
|---|---|---|
| active | R$29 | 22/07 08:29 |
| pending | R$29 | 22/07 08:20 |
| pending | R$29 | 22/07 08:20 |

Ou seja: 1 assinante real + 2 intents PIX pendentes (tentativas anteriores que não foram pagas). Não é resíduo de perfil deletado — é o mesmo assinante, com PIX abandonados persistidos como `pending`.

A função `getAssinantesStats` conta cada **linha** da tabela como novo/renovação e ainda soma `pending` no faturamento do período, inflando o card para "3 Assinantes, R$ 87,00" quando o correto é "1 Assinante, R$ 29,00".

## Correção

Em `src/lib/stats.functions.ts` → `getAssinantesStats`:

1. Filtrar `periodRes` para considerar somente assinaturas efetivamente pagas: `status in ('active','canceled','expired')` (exclui `pending` — intents PIX que nunca fecharam). Aplicar o mesmo filtro no `historyBefore` para não classificar como "renovação" um pending anterior.
2. Deduplicar por `subscriber_id` dentro do período ao calcular `novos` + `renovacoes`: cada assinante conta 1 vez por período (a primeira ocorrência). Se aparecer novamente, é renovação, mas o card principal deve exibir **assinantes únicos**, não linhas.
3. Ajustar o retorno para expor `assinantesUnicosPeriodo` (novos + renovações deduplicadas) e manter `novosPeriodo`/`renovacoesPeriodo` como métricas separadas.
4. `faturamentoPeriodo` passa a somar apenas as linhas não-`pending`.
5. Ajustar `daily` (usado no gráfico Faturamento × Quantidade) para também refletir apenas linhas pagas.

Em `src/routes/_authenticated/my-monetisex-stats.tsx` (AssinantesPanel, linha ~1698 e ~1711):
- Trocar `totalAssinantes = novosPeriodo + renovacoesPeriodo` por `stats.data?.assinantesUnicosPeriodo`, para o header "3 Assinantes, R$ 87,00" mostrar assinantes distintos.

## Limpeza opcional (fora do escopo, só sugestão)

Os 2 `pending` órfãos poderiam ser marcados como `expired` para higienizar o histórico, mas não é necessário para o fix da UI.

## Resposta curta ao usuário

Não é perfil deletado — são 2 tentativas de PIX abandonadas do mesmo assinante que ficaram como `pending` na tabela `subscriptions`. O card conta linha em vez de assinante único e ainda soma os pending no faturamento. O plano acima corrige as duas coisas.