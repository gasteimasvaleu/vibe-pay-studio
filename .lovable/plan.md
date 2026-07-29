## O que esse card faz hoje

É a lista detalhada de assinaturas do período (aba **Assinaturas** → seção "Assinantes"). Ela lê a tabela `subscriptions` filtrada por `creator_profile_id` e devolve uma linha **por registro de assinatura** criado no intervalo — não por assinante.

Colunas:
- **Nome / avatar**: dados do `profiles` do `subscriber_id`.
- **Status**: `Ativo` se `status='active'` e `current_period_end > agora`; qualquer outra coisa vira `Expirado`.
- **Preço**: `price_cents_paid` daquele registro.
- **Duração total**: `min(current_period_end, agora) - started_at` em dias — ou seja, "há quanto tempo essa assinatura específica está rodando".

Filtros no topo:
- **Todos**: todas as linhas do período.
- **Renovações**: linhas em que o `subscriber_id` já tinha assinatura antes desse período **ou** já apareceu antes dentro do próprio período (2ª+ ocorrência).
- **Novos assinantes**: a 1ª ocorrência daquele `subscriber_id` no período, sem histórico anterior.

## Por que ficou confuso no seu print

Os 3 registros são o mesmo `sexando_3fc0cc8a` — 1 assinatura paga (Ativo) + 2 intents PIX abandonados (status `pending`) que a UI está rotulando como "Expirado". A lista não deveria mostrar pendings como se fossem assinaturas expiradas, e o filtro "Renovações" não deveria classificar retries de PIX como renovação real.

## Correção

Em `src/lib/stats.functions.ts` → `getAssinantesList`:

1. Filtrar `periodRes` e `allRes` para `status in ('active','canceled','expired')` — mesmo tratamento aplicado em `getAssinantesStats`. Intents `pending` deixam de aparecer na lista.
2. Como consequência: com o dataset atual, a aba **Todos** mostra 1 linha (Ativo), **Renovações** fica vazia e **Novos assinantes** mostra a única assinatura real.

Nenhuma mudança de UI é necessária — o rótulo `Ativo/Expirado`, o preço e a duração continuam corretos para assinaturas que realmente existiram.

## Resposta curta

O card lista uma linha por assinatura criada no período. As 2 linhas "Expirado" que te confundiram são PIX pendentes do mesmo assinante que nunca fecharam — vou aplicar o mesmo filtro que já corrigiu o card de cima para o `getAssinantesList` ignorar `pending`.