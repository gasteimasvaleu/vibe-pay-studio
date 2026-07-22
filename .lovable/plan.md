## Diagnóstico do pagamento `pay_8qw0ylwfpi1zvuq7`

**O que funcionou ✅**
- Checkout de cartão abriu no Asaas (fluxo `UNDEFINED` → invoiceUrl gerou corretamente).
- Sanitização de texto: descrição foi enviada como "Assinatura MTX".
- Webhook `PAYMENT_CONFIRMED` chegou às 08:35:08, foi persistido em `asaas_events` e o `payment_intents.processed_at` foi carimbado às 08:35:14.
- Split calculado pelo Asaas: bruto R$ 29,00 → líquido R$ 27,65.

**O que NÃO funcionou ❌**
- `subscriptions.status` continua **`pending`** (deveria ser `active`).
- `subscriptions.updated_at` não mudou desde 08:29:44 — ou seja, o `UPDATE` disparado pelo reconcile **não persistiu**.
- Nenhuma linha foi criada em `public.transactions` para esse pagamento (o trigger `trg_subscriptions_sync_tx` só dispara quando `status` vira `active`).
- Consequência: comissão da plataforma e valor líquido do creator não foram registrados no ledger interno; o botão "welcome message" e o bump de promoção também não rodaram.

**Causa provável (a confirmar)**
`applyPaidIntent` chama `supabase.from("subscriptions").update({ status: "active", provider_ref }).eq("id", id)` mas **não checa o `error` retornado**. Como `processed_at` no intent é escrito na sequência, um erro silencioso do UPDATE (RLS do service_role via PostgREST em coluna com trigger `SECURITY DEFINER`, ou falha no trigger `send_welcome_message_on_subscription`/`sync_transaction`) fica invisível.

## Plano

1. **Reproduzir e confirmar a causa**
   - Executar manualmente `UPDATE subscriptions SET status='active' WHERE id='5c441af4…'` via migração e observar se algum trigger (welcome message, sync_tx) lança erro.
   - Se o UPDATE passar, o bug estava só na falta de checagem de erro; se falhar, corrigir o trigger que estoura.

2. **Endurecer `applyPaidIntent` (`src/lib/payments-reconcile.server.ts`)**
   - `markStatusPaid` passa a retornar `{ error }` do Supabase e lançar `Error` em caso de falha.
   - `applyPaidIntent` só carimba `processed_at` no intent **depois** que o `UPDATE` do referenceTable foi bem-sucedido. Se der erro, deixa o intent sem processar para que o poller/webhook tente de novo.
   - Log estruturado (`console.error`) com `intent.id`, `referenceTable`, `referenceId` para facilitar debug futuro.

3. **Reconciliar retroativamente o pagamento atual**
   - Após o fix, executar uma migração one-off que:
     - marca `subscriptions.id = 5c441af4…` como `active` (dispara triggers → cria transaction, envia welcome, bump de promoção se houver).
     - reprocessa qualquer outro `payment_intents` cujo `event_type='PAYMENT_CONFIRMED'` esteja com `processed_at` mas cujo referenceTable ainda esteja `pending`/não-paid (varredura defensiva).

4. **Verificação final**
   - Confirmar `subscriptions.status='active'`, presença de uma linha em `transactions` com `kind='subscription'`, `net_cents=2329`, `provider_ref='pay_8qw0ylwfpi1zvuq7'` e `creator_profile_id` correto.

## Detalhes técnicos

- Arquivos afetados: `src/lib/payments-reconcile.server.ts` (fix principal). Sem alterações no webhook route — ele apenas delega para `applyPaidIntent`.
- Migração de correção pontual: um `UPDATE` numa migração, sem alterar schema.
- Sem alterações de UI, sem mudanças em fluxo de checkout — o pagamento em si já funcionou; o bug é apenas na etapa de reconciliação/observabilidade.