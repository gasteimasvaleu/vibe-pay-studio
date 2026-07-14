# Descontar taxas do Asaas do creator (100%)

Hoje o split envia 85% ao creator via Asaas e a plataforma retém 15% brutos — mas todas as taxas de gateway são debitadas da conta principal, o que pode gerar prejuízo em transações pequenas. Vamos passar essas taxas 100% para o creator.

## Tarifas cadastradas (valores padrão, sem promocional)

| Método       | Taxa                     |
| ------------ | ------------------------ |
| PIX          | R$ 1,99 por cobrança     |
| Boleto       | R$ 1,99 por boleto pago  |
| Crédito à vista (1x) | 2,99% + R$ 0,49  |

Débito e parcelado ficam de fora por não estarem em uso hoje.

## O que muda

1. **Cálculo do líquido do creator**
   `platform_commission = round(gross * 15%)`
   `gateway_fee = tabela do método`
   `net_creator = gross − platform_commission − gateway_fee`
   `platform_net = platform_commission` (fica exatamente com os 15% cheios)
   Se `net_creator ≤ 0` a compra é bloqueada com mensagem clara ("valor muito baixo para cobrir taxas").

2. **Split no Asaas**
   Deixa de ser percentual fixo (85%) e passa a ser `fixedValue = net_creator` (em BRL). Assim o Asaas debita a taxa da parcela do creator e a plataforma recebe o valor cheio da comissão.

3. **Registro contábil**
   Nova coluna `gateway_fee_cents` em `transactions`. O trigger passa a persistir `platform_fee_cents` (15%) + `gateway_fee_cents` (taxa Asaas) e `net_cents` já descontando ambos. Wallet do creator credita esse `net_cents` novo (menor).

4. **Pagamentos por carteira interna (`pay_with_wallet`)**
   Não há taxa Asaas envolvida — mantém só os 15% da plataforma.

5. **UI de estatísticas do creator**
   `my-monetisex-stats` exibe as taxas de gateway destacadas ("Taxa do meio de pagamento") junto da comissão da plataforma, para o creator entender o líquido.

## Detalhes técnicos

- Migration:
  - `ALTER TABLE transactions ADD COLUMN gateway_fee_cents BIGINT NOT NULL DEFAULT 0;`
  - Nova função `public.calc_gateway_fee_cents(_gross_cents bigint, _method payment_method) RETURNS bigint` com a tabela acima (PIX/boleto = 199; credit_card = ceil(gross*0.0299)+49; wallet/manual = 0).
  - `public.apply_transaction_split` ganha parâmetro opcional `_method` e passa a retornar também `gateway_fee_cents`; `net_cents = gross − platform_fee − gateway_fee`.
  - Todos os triggers `*_sync_transaction` passam `_method` ao chamar `apply_transaction_split` e gravam `gateway_fee_cents`.
- `src/lib/asaas.server.ts` `createPayment`:
  - Recebe `netCreatorCents` além de `creatorWalletId`.
  - Envia `split: [{ walletId, fixedValue: centsToBrl(netCreatorCents) }]` em vez de `percentualValue`.
- `src/lib/payments.functions.ts`: computa `gateway_fee` + `net_creator` antes de chamar `createPayment`, valida `net_creator > 0` e persiste o valor no `payment_intents` para reconciliação.
- `src/lib/payments-reconcile.server.ts`: quando materializa a transação a partir do webhook, usa o `gateway_fee` calculado no momento da intenção (não recalcula sobre `netValue` do Asaas para evitar divergência de arredondamento).
- Frontend: `src/routes/_authenticated/my-monetisex-stats.tsx` soma `gateway_fee_cents` como linha separada na tabela.

## Fora de escopo

- Precificação promocional automática (usaremos só o padrão, conforme sua escolha).
- Cadastro de débito, cartão parcelado e antecipação.
- Rateio proporcional de taxa (100% cai no creator).
