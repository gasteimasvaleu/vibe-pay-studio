## Problema

A recarga de R$50,00 foi processada com sucesso (webhook Asaas creditou `subscriber_wallets.balance_cents = 5000`), mas a página `/mywallet` mostra `R$ -` fixo no template — nunca consulta o banco. A seção "Últimas Transações" também é estática ("Nenhuma transação encontrada").

## Alterações

### 1. `src/lib/finance.functions.ts`
Adicionar `listSubscriberTransactions` (server fn autenticada) que retorna as últimas transações onde `buyer_id = userId` (kinds: `wallet_topup`, `wallet_bonus`, `publication_unlock`, `chat_unlock`, `subscription`, `tip`, `video_call`), ordenadas por `created_at desc`, com limite (default 10).

Campos: `id, kind, status, amount_cents_gross, payment_method, created_at`.

### 2. `src/routes/_authenticated/mywallet.index.tsx`
- Usar `useQuery` (via `useServerFn`) para chamar `getSubscriberWallet` e `listSubscriberTransactions`.
- Substituir `R$ -` pelo `balanceCents` formatado em BRL (mostrar `R$ 0,00` quando zero, skeleton enquanto carrega).
- Renderizar a lista de "Últimas Transações" com label amigável por `kind` (ex: "Recarga via PIX", "Desbloqueio de publicação"), data curta e valor formatado (positivo para topup/bonus, negativo para compras). Manter mensagem "Nenhuma transação encontrada" apenas quando a lista vier vazia.
- Manter todo o resto (cartões, botões, layout) inalterado.

### Detalhes técnicos
- Query keys: `["subscriber-wallet"]` e `["subscriber-transactions"]`.
- Formatação com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- Sem mudanças em rotas, migrations, ou webhook — o backend já funciona corretamente.
