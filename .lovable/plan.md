## Problema

Ao clicar em **Pagar R$ 14,90**, a API do Asaas responde 400 com:

```
{"code":"user_agent_not_informed","description":"É obrigatório preencher User-Agent no cabeçalho da requisição"}
```

O Asaas passou a exigir o header `User-Agent` em toda requisição. O helper `asaasFetch` em `src/lib/asaas.server.ts` não envia esse header, então **todas** as chamadas Asaas (criação de pagamento PIX, cartão, transferências, wallets, subaccounts) estão sujeitas ao mesmo erro.

## Correção

Em `src/lib/asaas.server.ts`, dentro de `asaasFetch`, adicionar um `User-Agent` padrão identificando a plataforma (permitindo override via `init.headers`):

```ts
headers: {
  "Content-Type": "application/json",
  "User-Agent": "VibePayStudio/1.0 (+https://vibe-pay-studio.lovable.app)",
  access_token: apiKey ?? getApiKey(),
  accept: "application/json",
  ...(init.headers ?? {}),
},
```

Uma única alteração de ~1 linha cobre todos os endpoints (`/payments`, `/transfers`, `/wallets`, `/accounts`, etc.).

## Arquivos alterados

- `src/lib/asaas.server.ts` — adicionar `User-Agent` em `asaasFetch`.
