## Diagnóstico

O card de “Meu Banco” está lendo `creator_wallets.released_cents` via `getCreatorBancoOverview`. No banco, o saque PIX concluído aparece em `withdrawals` como `paid` no valor de R$ 62,00, mas `creator_wallets.released_cents` ainda está R$ 62,66. Ou seja: o extrato de saques está correto, mas a fonte usada pelo card não foi debitada de forma persistente.

## Plano de correção

1. **Corrigir a fonte real do saldo**
   - Ajustar `getCreatorBancoOverview` para calcular o saldo disponível real como:
     - `creator_wallets.released_cents` menos saques ativos/concluídos (`withdrawals.status in ('requested', 'paid')`)
   - Isso faz o card mostrar o valor real mesmo quando a coluna da wallet ficou defasada.

2. **Corrigir também o resumo do dashboard**
   - Aplicar a mesma lógica em `getCreatorEarningsSummary`, para o card “Liberado” do painel não continuar mostrando saldo antigo.

3. **Fortalecer o fluxo de saque**
   - Depois de criar/concluir saque, garantir que a resposta retorne o saldo esperado pós-saque.
   - Manter o update otimista no front, mas deixar o próximo refetch vir da fonte corrigida.

4. **Evitar dupla subtração futura**
   - Como o banco atual já ficou inconsistente, a leitura corrigida passa a tratar `withdrawals` como o livro-caixa dos débitos.
   - Não vou alterar Asaas, regras de saque, schema ou migrações sem necessidade.

## Arquivos previstos

- `src/lib/finance.functions.ts`
- `src/lib/payouts.functions.ts` se necessário para retornar o saldo atualizado
- `src/routes/_authenticated/banco.tsx` apenas se precisar ajustar o callback/refetch

## Validação

- Confirmar que, para o caso atual, R$ 62,66 - R$ 62,00 = R$ 0,66 aparece no card.
- Confirmar que a lista “Saques” continua mostrando o saque PIX concluído.
- Confirmar que o dashboard não mostra mais o saldo anterior.