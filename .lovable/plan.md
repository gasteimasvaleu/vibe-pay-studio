## Problema

Asaas 400 `invalid_action`: "Não é permitido split para sua própria carteira."

O `creatorWalletId` enviado no `split` é o mesmo wallet da API key da plataforma (`ASAAS_API_KEY`). Isso acontece quando o creator cadastrou como Wallet ID a própria wallet da conta principal (típico em ambiente sandbox / auto-teste) — Asaas proíbe splitar para si mesmo.

## Correção

Detectar essa condição e omitir o split.

### 1. `src/lib/asaas.server.ts`

- Adicionar `getPlatformWalletId()` que chama `getWalletForApiKey(process.env.ASAAS_API_KEY!)` e memoiza o resultado em uma variável de módulo (`let cached: string | null = null`). Usar sem apiKey adicional (usa a padrão).
- Em `createPayment`, antes de montar `body.split`:
  - `const platformWalletId = await getPlatformWalletId().catch(() => null);`
  - Se `input.creatorWalletId && platformWalletId && input.creatorWalletId === platformWalletId` → **não** adicionar `body.split` (100% vai para a conta principal; o crédito ao creator já é registrado localmente via trigger `transactions_apply_wallet_effects` na tabela `creator_wallets`).
  - Caso contrário, comportamento atual.

### 2. Nada muda no fluxo do banco / trigger

A tabela `transactions` continua sendo alimentada normalmente (net_cents vai para `creator_wallets` do author), então o creator ainda vê o saldo. A diferença é só que no Asaas o dinheiro não é dividido — fica todo na conta principal — o que é o comportamento correto quando "creator" e "plataforma" são a mesma wallet Asaas.

## Arquivos alterados

- `src/lib/asaas.server.ts` — nova `getPlatformWalletId()` + guard em `createPayment`.

Sem migration.
