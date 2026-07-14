## Problema

O PIX é enviado com sucesso e o `creator_wallets.released_cents` é debitado no servidor, mas o card "Saldo liberado" continua mostrando o valor antigo.

## Causa

`getCreatorBancoOverview` (src/lib/finance.functions.ts) calcula `releasedNational` / `releasedIntl` somando `transactions.net_cents` de todos os pagamentos com `wallet_released_at` preenchido. O saque **não altera** essas transações — ele só debita `creator_wallets.released_cents`. Resultado: a soma derivada continua igual e a UI não reflete o débito.

O fallback existente só é usado quando a soma derivada é zero, então nunca dispara depois de um pagamento real.

## Correção

Alinhar o overview ao valor real da carteira, mantendo a divisão nacional × internacional derivada das transações apenas como proporção.

Em `getCreatorBancoOverview`:

1. Manter o cálculo atual de `releasedNational` / `releasedIntl` a partir das transações como "bruto histórico liberado".
2. Usar `walletRes.data.released_cents` como fonte da verdade do total liberado atual.
3. Se `releasedNational + releasedIntl > 0`, distribuir o total real da carteira proporcionalmente entre nacional e internacional (arredondando o internacional e dando o restante ao nacional para bater o total).
4. Se a soma histórica for zero, jogar tudo em nacional (fallback atual).
5. Pendentes continuam vindo das transações (não são afetados por saque).

Nenhuma mudança em UI, RLS, ou lógica de saque. `SacarDialog` já invalida `bancoOverview` no `onSuccess` — a invalidação passará a mostrar o valor correto assim que o cálculo for corrigido.

## Escopo

- **Editar:** `src/lib/finance.functions.ts` (apenas a função `getCreatorBancoOverview`).
- **Não mexer:** `SacarDialog`, RLS, `requestWithdrawal`, outras queries.
