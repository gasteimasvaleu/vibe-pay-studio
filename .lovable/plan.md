# Diagnóstico

Duas coisas foram olhadas:

1. **Valor da cobrança do story** — o PIX gerado para desbloquear o story `551d1b82…` foi de **R$10,00** (o `price_cents` do story é 1000 e os três `payment_intents` criados pelo checkout registraram `value:10`). A linha de R$39,90 que aparece no painel Asaas do cliente `cus_000188942724` é de outra transação (`pay_3705zv357tk609vx`, 27/07) referente a uma **videochamada**, não a este unlock. Ou seja: não houve cobrança errada — o painel do Asaas está listando pagamentos anteriores do mesmo cliente.

2. **Por que o story não desbloqueou** — o webhook `PAYMENT_RECEIVED` do PIX de R$10 (`pay_0suro09hl3fkuxz2`) chegou às 09:52 e falhou com:

```
[asaas webhook] processing error
Error: markStatusPaid failed [story_unlocks#26e776a4-…]:
invalid input value for enum transaction_kind: "story_unlock"
```

Existe um trigger `story_unlocks_sync_transaction_trg` (BEFORE UPDATE) que, ao virar `status='paid'`, insere/atualiza uma linha em `transactions` com `kind='story_unlock'`. Esse valor **não existe** no enum `public.transaction_kind` (que tem `subscription`, `publication_unlock`, `chat_unlock`, `tip`, `video_call`, `live_ticket`, `challenge_contribution`, `wallet_topup`, `wallet_bonus`, `referral_credit`, `affiliate_credit`, `withdrawal`, `refund`). O trigger aborta o UPDATE, o unlock fica preso em `pending`, e como o webhook lança erro, o `payment_intents.processed_at` também não é gravado — sem retry.

# O que fazer

## Migração 1 — adicionar o valor ao enum

```sql
ALTER TYPE public.transaction_kind ADD VALUE IF NOT EXISTS 'story_unlock';
```

`ALTER TYPE ... ADD VALUE` não pode ser usado no mesmo bloco transacional em que o novo valor é lido. Precisa ficar sozinho.

## Migração 2 — reconciliar o pagamento travado

Depois da 1ª aplicar:

- `UPDATE public.story_unlocks SET status='paid', provider_ref='pay_0suro09hl3fkuxz2' WHERE id='26e776a4-f38a-4934-969f-436b298ebd43';` (agora o trigger consegue criar a `transactions`)
- `UPDATE public.payment_intents SET processed_at=now(), event_type='PAYMENT_RECEIVED' WHERE asaas_payment_id='pay_0suro09hl3fkuxz2';`
- Marcar como superseded os outros dois intents duplicados (`pay_eidw8wltek7sdbbn`, `pay_7y1d0y30m6g9enjp`) do mesmo `referenceId` com `processed_at=now(), event_type='SUPERSEDED'` — o story só admite um unlock por comprador e o Asaas continua enviando `PAYMENT_OVERDUE` para eles no vencimento.
- `UPDATE public.asaas_events SET processed_at=now() WHERE event_id='evt_d26e303b238e509335ac9ba210e51b0f&1439735461';`

## Verificação

- Painel do assinante deve mostrar o story desbloqueado, e a `transactions` correspondente (`kind='story_unlock'`) precisa existir com o líquido para o criador.
- Próximos unlocks via PIX/cartão passam a fechar automaticamente pelo webhook, e o polling do `getPaymentIntentStatus` também converge (usa o mesmo `applyPaidIntent`).

# Fora do escopo

- Nenhuma alteração de frontend, de preço, ou do valor de story. O `StoryViewer` e o `PaymentCheckout` já invalidam a query e mostram sucesso — o gargalo é 100% backend.
