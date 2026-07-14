## Plano

1. **Trocar o refresh por atualização determinística do cache**
   - No sucesso do saque, atualizar diretamente o cache de `bancoOverview` usando o valor debitado e o saldo anterior recebido pelo modal.
   - Assim o card muda imediatamente, sem depender do timing do `invalidateQueries` ou de uma resposta antiga do servidor.

2. **Evitar que um refetch antigo sobrescreva o saldo correto**
   - Cancelar consultas em andamento de `bancoOverview` antes do update otimista.
   - Só aceitar o refetch/polling quando o saldo retornado pelo servidor for menor ou igual ao saldo esperado após o saque.

3. **Manter o card sincronizado após o banco confirmar**
   - Depois do update imediato, refazer `bancoWithdrawals`, `bancoTransactions` e `payoutStatus`.
   - Reconsultar `bancoOverview` por alguns segundos e manter o saldo otimista enquanto o servidor ainda retorna o valor anterior.

4. **Corrigir o modal junto**
   - Garantir que o `SacarDialog` envie o `previousReleasedCents` para o callback e sincronize o campo com o saldo atualizado ao reabrir.

## Arquivos previstos

- `src/routes/_authenticated/banco.tsx`
- `src/components/banco/SacarDialog.tsx`

## Fora de escopo

- Não alterar Asaas, regra de saque, schema do banco ou migrações; a correção é no fluxo de UI/cache do card.