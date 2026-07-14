## Problema

Ao salvar o cadastro em `/banco/cadastrar` com uma API key, aparece o toast **"não foi possível recuperar o Wallet ID com essa API key"**.

Causa: em `src/lib/asaas.server.ts`, `getWalletForApiKey` chama `GET /v3/wallets/` esperando um objeto único com `walletId`/`id`. Mas o endpoint do Asaas retorna uma **lista paginada**:

```json
{ "object": "list", "hasMore": false, "totalCount": 1, "data": [ { "id": "<wallet-uuid>", "name": "...", ... } ] }
```

Como o código lê `body.walletId` / `body.id` no root, nunca encontra o ID e sempre lança o erro — mesmo quando a API key é válida.

## Correção

Ajustar `getWalletForApiKey` em `src/lib/asaas.server.ts` para:

1. Ler `body.data` como array e extrair o `id` do primeiro item (a wallet principal do Asaas é sempre a primeira). Também aceitar `walletId` como fallback caso o Asaas mude a resposta.
2. Se o array vier vazio ou sem `id` string, aí sim lançar o erro atual em português.
3. Manter o retorno `{ walletId }`.

Nenhuma outra alteração é necessária — a validação em `saveCreatorPayoutSetup` (comparar `recovered.walletId` com o Wallet ID digitado) continua funcionando, e a mensagem específica "Wallet ID não corresponde à API key informada" só aparece quando de fato divergirem.

## Arquivos alterados

- `src/lib/asaas.server.ts` — só a função `getWalletForApiKey` (~10 linhas).
