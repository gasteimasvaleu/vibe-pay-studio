## Objetivo
Fazer `/mywallet/extrato` mostrar transações reais do usuário aplicando os filtros existentes.

## Alterações

### 1. `src/lib/finance.functions.ts` — atualizar `listSubscriberTransactions`
Aceitar filtros opcionais no inputValidator:
- `kinds?: string[]` (transaction_kind[])
- `paymentMethods?: string[]` (payment_method[])
- `statuses?: string[]` (transaction_status[])
- `from?: string`, `to?: string` (ISO datetimes)
- `limit?: number` (default 50, max 200)

Aplicar via `.in()` / `.gte()` / `.lte()` no query builder. Manter compat com chamada antiga sem filtros.

### 2. `src/routes/_authenticated/mywallet.extrato.tsx`
- Chamar `listSubscriberTransactions` com `useServerFn` + `useQuery`, passando os filtros mapeados dos selects.
- Mapear labels PT → valores do enum:
  - Tipo de item: Assinatura→`subscription`, Chat→`chat_unlock`, Mimo→`tip`, Postagem→`publication_unlock`, Recarga Wallet→`wallet_topup`+`wallet_bonus`, Videochamada→`video_call`. Desafio/Live → arrays vazios (retorna vazio).
  - Tipo de pagamento: Cartão→`credit_card`, Pix→`pix`, PicPayWallet→`wallet`. ApplePay/GooglePay → vazios.
  - Status: Autorizado→`paid`, Devolvido→`refunded`, Negado→`failed`+`cancelled`.
- Datas: converter `range.from`/`range.to` para ISO (start-of-day / end-of-day).
- Renderizar lista abaixo dos filtros com: label do tipo, data (`dd/MM/yyyy HH:mm`), método de pagamento, status colorido, valor em BRL (crédito verde com `+`, débito neutro com `−`).
- Mostrar estado de loading e mensagem "Nenhuma transação encontrada" apenas quando a query terminar vazia.
- Manter todos os componentes de filtro e layout atuais inalterados.

### Detalhes técnicos
- Query key: `["subscriber-transactions", filters]` para refetch automático ao mudar filtros.
- `queryFn` chama `listTx({ data: filtersPayload })`.
- Sem migrations, sem mudanças em backend além da função ampliada.
