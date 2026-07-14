# Verificação de outros locais de saldo

Fiz uma varredura em todo o código buscando leituras de `creator_wallets.released_cents` e componentes que exibem saldo do criador.

## Locais que exibem saldo do criador

| Local | Fonte de dados | Status |
|---|---|---|
| `/banco` — card de saldo | `getCreatorBancoOverview` | Já corrigido |
| Dashboard — `EarningsSummary` | `getCreatorEarningsSummary` | Já corrigido |
| `/my-monetisex-stats` — card "Meu Banco" | `getCreatorEarningsSummary` | Já corrigido |
| Validação em `requestWithdrawal` | leitura direta de `creator_wallets` | Já corrigido (desconta `requested + paid`) |

## Locais não relacionados (não precisam de mudança)

- `/mywallet` — é a wallet do **assinante** (`subscriber_wallets.balance_cents`), não do criador.
- `admin.functions.ts` — não lê mais `creator_wallets`; apenas atualiza status de `withdrawals`.

## Conclusão

As três funções que expõem saldo do criador (`getCreatorWallet`, `getCreatorBancoOverview`, `getCreatorEarningsSummary`) já aplicam a mesma fórmula `released_cents − sum(withdrawals in ['requested','paid'])`. Todos os componentes de UI consomem uma dessas três funções, então o saldo pós-saque já está consistente em todo o app.

**Nenhuma alteração de código é necessária.** Se aprovar este plano, apenas confirmo a análise sem editar arquivos.
