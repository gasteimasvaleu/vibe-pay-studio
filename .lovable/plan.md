## Plano

1. **Corrigir a atualização visual do saldo após saque**
   - Ajustar o pós-sucesso do saque para buscar novamente o saldo do banco de forma explícita e aguardar a atualização, em vez de depender só de `invalidateQueries`.
   - Enquanto atualiza, manter o estado de carregamento/refetch visível para evitar que o saldo antigo pareça confirmado.

2. **Evitar valor antigo ao reabrir o modal de saque**
   - Sincronizar o valor inicial do `SacarDialog` sempre que o saldo liberado recebido por props mudar ou quando o modal abrir.
   - Isso impede que o campo do modal continue preenchido com o saldo anterior ao saque.

3. **Adicionar uma checagem curta de consistência**
   - Depois do saque, refazer a consulta de `bancoOverview`, `bancoWithdrawals`, `bancoTransactions` e `payoutStatus`.
   - Se necessário, repetir a busca do saldo algumas vezes por poucos segundos para cobrir atraso entre Asaas/DB/UI.

## Detalhes técnicos

- A função `getCreatorBancoOverview` já está usando `creator_wallets.released_cents` como fonte da verdade.
- No banco, o saldo atual está `R$ 62,66` após um saque pago de `R$ 62,00`, e a tela atual já mostra `R$ 62,66`; o problema restante parece ser cache/refetch/estado local após a ação.
- Arquivos previstos:
  - `src/components/banco/SacarDialog.tsx`
  - `src/routes/_authenticated/banco.tsx`