## Objetivo
Ativar o botão **Sacar** dos cards de saldo em `/banco`. Ao confirmar, dispara uma transferência PIX real via Asaas para a chave PIX cadastrada em "Dados bancários". Também mostrar histórico de saques logo abaixo do Extrato.

## Backend
Nada novo. Já existe:
- `requestWithdrawal({ amountCents, pixKey, pixKeyType })` em `src/lib/payouts.functions.ts` — valida mínimo (R$50,00), confere `released_cents`, debita a wallet, cria linha em `withdrawals`, chama Asaas `createPixTransfer` e faz poll do status; em caso de erro, reverte saldo e marca `failed`.
- `cancelWithdrawal({ withdrawalId })` — cancela um saque ainda `requested` e devolve o valor ao saldo.
- `listCreatorWithdrawals` — lista os saques do creator.
- `getCreatorPayoutStatus` já retorna `payoutAccount.pixKey` e `payoutAccount.pixKeyType`.

Pré-requisitos que o backend já cobre (apenas superficiar na UI):
- Wallet Asaas configurada (`status.walletId`).
- API key Asaas do creator cadastrada (`status.hasApiKey`) — sem ela, o server responde com mensagem pedindo para cadastrar; o botão só habilita quando existir.
- Saldo liberado ≥ R$ 50,00 (mínimo hoje no server).

## Novo componente
`src/components/banco/SacarDialog.tsx` — dialog controlado, recebe:
- `open`, `onOpenChange`
- `origem`: `"Nacional" | "Internacional"` (só label; o backend não separa)
- `saldoLiberadoCents`
- `pixKey`, `pixKeyType`
- `onSuccess()`

Comportamento:
- Campo "Valor" em BRL (input mascarado, default = saldo total liberado do card).
- Validações locais: > 0, ≤ saldo liberado, ≥ R$ 50,00 (mín. do server); mensagens inline.
- Mostra a chave PIX de destino (readonly) — link "Alterar dados bancários" que redireciona para `/banco/cadastrar`.
- Botão "Confirmar saque" → chama `requestWithdrawal` via `useMutation`.
- Sucesso: toast "Saque solicitado" com status retornado, `invalidateQueries` de `bancoOverview`, `bancoTransactions`, `bancoWithdrawals`, `payoutStatus`, fecha dialog.
- Erro: toast com a mensagem do server (já em pt-BR).

## Mudanças em `src/routes/_authenticated/banco.tsx`

### 1. Estado do dialog e handlers
- `const [sacarOrigin, setSacarOrigin] = useState<null | "Nacional" | "Internacional">(null)`.
- Botão "Sacar" de cada card: onClick abre o dialog com o `label` correspondente.

### 2. Habilitação do botão
Trocar o `disabled` atual para considerar todos os pré-requisitos:
- `walletActive` (já existe)
- `status?.hasApiKey`
- `payoutAccount?.pixKey`
- `c.released >= 5000` (mín. saque)
Título/tooltip dinâmico explicando o motivo quando desabilitado (KYC, wallet, API key, PIX ausente, saldo abaixo do mínimo).

### 3. Nova seção "Saques"
Abaixo do Extrato, antes de "Integração com Asaas":
- `useQuery(["bancoWithdrawals"], listCreatorWithdrawals)`.
- Vazio → não renderiza a seção (para não poluir quem nunca sacou).
- Item: valor, status humanizado (Solicitado / Concluído / Rejeitado / Falhou), data `requested_at`, chave PIX ofuscada, motivo de rejeição quando houver.
- Se `status === "requested"` → botão "Cancelar" que chama `cancelWithdrawal` com confirmação (`window.confirm`), invalida as mesmas queries.

## Fora de escopo
- Fluxo internacional real: hoje o backend faz tudo via Asaas/PIX nacional. Se o creator clicar em "Sacar" no card Internacional, a transferência ainda vai pela mesma chave PIX (a UI mostra um aviso no dialog). Suporte real a transfer internacional fica para outra iteração.
- Escolher entre múltiplas chaves PIX — hoje só existe uma no `payout_accounts`.
- Fila/histórico paginado de saques — mostra todos (a lista costuma ser curta).
- Ajustar mínimo de saque no server (R$ 50,00 continua).

## Como testar
1. Creator com KYC + wallet + API key + saldo ≥ R$ 50 → botão habilita, dialog abre, saque cai em `withdrawals` com `provider_ref` do Asaas e `released_cents` diminui.
2. Creator sem API key → botão desabilitado com tooltip "Cadastre sua API Key Asaas".
3. Creator com saldo < R$ 50 → tooltip "Saldo mínimo para saque: R$ 50,00".
4. Cancelar saque `requested` → status vira `rejected` e saldo liberado volta.