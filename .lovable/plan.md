## Objetivo

Fechar as duas lacunas atuais de `/promotions`:

1. `subscriptions_used` nunca é incrementado quando alguém assina — fica sempre em `0/N`.
2. Não há job que marque `status='ended'` quando `ends_at` vence; hoje só é derivado em memória na listagem.

## Escopo

Só backend (Supabase + server functions). A UI de `/promotions` já lê os campos certos — vai passar a mostrar dados reais sem alterações.

## 1. Contador de participantes (`subscriptions_used`)

Fazer via **trigger no banco** para funcionar em todos os caminhos de pagamento (Asaas via webhook, `pay_with_wallet`, futuros gateways) sem depender do código de aplicação lembrar de incrementar.

Migration:

- Adicionar coluna `subscriptions.promotion_id uuid` (nullable, FK para `promotions.id`, `ON DELETE SET NULL`) + índice.
- Trigger `AFTER INSERT OR UPDATE OF status ON public.subscriptions`:
  - Quando a assinatura passa a `status='active'` e `promotion_id IS NOT NULL`, faz `UPDATE promotions SET subscriptions_used = subscriptions_used + 1` atomicamente.
  - Se o incremento fizer `subscriptions_used >= max_subscriptions`, encerra a promoção (`status='ended'`) no mesmo `UPDATE`.
  - Idempotência: só incrementa quando `(TG_OP='INSERT' AND NEW.status='active')` ou `(TG_OP='UPDATE' AND OLD.status <> 'active' AND NEW.status='active')`.

Server function (`pay_with_wallet` e checkout Asaas de assinatura):

- Quando o comprador está numa promoção ativa do criador, aplicar `promo_price` no cálculo e gravar `promotion_id` na linha de `subscriptions`.
- Validar no servidor (não confiar em input do cliente): reconsultar `getActivePromotionForCreator` para o `creatorId`, aplicar preço promocional se existir promoção com vaga.
- Bloquear a assinatura quando a promoção "vencer no meio do caminho" (checar `subscriptions_used < max_subscriptions` dentro da mesma transação; a trigger acima é a garantia final).

## 2. Encerramento automático quando `ends_at` vence

Usar `pg_cron` puro (Opção 1 do knowledge — só SQL, sem endpoint externo):

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'promotions-auto-end',
  '*/15 * * * *',
  $$
  UPDATE public.promotions
     SET status = 'ended', updated_at = now()
   WHERE status = 'active'
     AND ends_at <= now();
  $$
);
```

Roda a cada 15 minutos. O campo `is_active` derivado em `listMyPromotions` continua funcionando como "segurança em tempo real" no intervalo entre execuções.

## Fora de escopo

- Notificar o criador quando a promoção encerra (nem por vagas nem por tempo).
- Histórico de "quem assinou pela promoção" na UI (dados já ficam em `subscriptions.promotion_id` para futuro).
- Mudanças visuais em `/promotions` ou `/promotion`.

## Detalhes técnicos

- Migration única com: nova coluna `promotion_id`, índice, função de trigger, trigger, e `cron.schedule`. Extensão `pg_cron` já pode estar habilitada — o `CREATE EXTENSION IF NOT EXISTS` é seguro.
- RLS de `promotions` continua igual; a trigger roda como `SECURITY DEFINER` para poder atualizar `subscriptions_used` mesmo quando o `UPDATE` da assinatura vem de um contexto autenticado que não é o criador.
- Ajustar `src/lib/wallet-pay.functions.ts` e o caminho do checkout Asaas de assinatura para: (a) buscar promoção ativa do criador, (b) usar `promo_price*100` como `price_cents_paid`, (c) preencher `promotion_id`.
