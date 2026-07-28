# Remover auto-renovação e comunicar renovação manual

A chave Asaas ainda não permite tokenização, então vamos parar de prometer renovação automática e ajustar UI + backend para renovação manual explícita, com lembrete por e-mail 7 dias antes.

## 1. Backend — parar de criar assinatura recorrente no Asaas

`src/lib/payments.functions.ts` — `createSubscriptionPayment`:
- Remover a chamada `asaas.createAsaasSubscription(...)` e o bloco `try/catch` associado.
- No insert de `subscriptions`, gravar `auto_renew: false`.
- No update pós-pagamento, não setar `asaas_subscription_id` nem `next_charge_at` (ficam null).

## 2. Webhook — ignorar renovações

`src/routes/api/public/webhooks/asaas.ts`:
- Bloco `SUBSCRIPTION_*` (linhas ~253-312): reduzir a apenas `console.log`. Não atualizar tabela `subscriptions`.
- Bloco "subscription renewal handling" via `payment.subscription` (linhas ~371-485): reduzir a `console.log`. Não criar/estender `subscriptions`, não gerar `transactions`, não disparar e-mail de fatura.

## 3. Cancelamento — não chamar DELETE no Asaas

`cancelSubscription` (em `src/lib/admin-ops.functions.ts` e/ou `src/lib/payments.functions.ts`, o que estiver ativo):
- Remover `asaas.cancelAsaasSubscription(...)`.
- Manter só o update local (`status`, `cancelled_at`, `auto_renew=false`).

## 4. UI — comunicar renovação manual

**`src/components/payments/SubscribeDialog.tsx`:**
- Sob os planos, adicionar aviso pequeno: *"Renovação manual — enviamos um lembrete por e-mail antes do vencimento."*

**`src/routes/_authenticated/perfil.$username.tsx`** (`ActiveSubscriptionCard`):
- Remover qualquer texto de "renovação automática" e botão "Cancelar renovação automática".
- Copy: **"Assinatura ativa até {data} · Expira em N dias"**.
- Botão principal **"Renovar agora"** que reabre o `SubscribeDialog` (soma tempo restante, lógica já existente).
- Quando faltarem ≤7 dias: alerta amarelo *"Sua assinatura vence em N dias. Renove para não perder acesso."*

**`src/routes/_authenticated/subscriptions.tsx`:**
- Remover toggle/coluna "auto-renovação".
- Cada linha: badge "Ativa até dd/mm" + botão **Renovar** (abre `SubscribeDialog` com o criador da linha).
- Remover botão "Cancelar renovação"; manter apenas "Cancelar assinatura" (encerra na hora se for esse o comportamento vigente, ou remover se desnecessário — como não renova sozinha, cancelar antes do fim é opcional).

**`src/routes/_authenticated/admin.subscriptions.tsx`:**
- Remover coluna **Auto** e o botão **Desligar auto**.
- Manter apenas **Encerrar já**.

## 5. Lembrete por e-mail (7 dias antes)

- Criar rota `src/routes/api/public/hooks/subscription-reminders.ts` (POST, sem auth — protegida por header secret `X-Reminders-Token` conferido contra `process.env.REMINDERS_TOKEN`).
- Query: `subscriptions` com `status='active'`, `current_period_end` entre `now()` e `now() + 7 days`, e `reminder_sent_at IS NULL`.
- Para cada uma, enviar e-mail via Resend (helper já existente em `src/lib/email.server.ts`) com link direto `${APP_BASE_URL}/perfil/{creator_username}` e o valor sugerido.
- Marcar `reminder_sent_at = now()`.
- Agendar `pg_cron` diário chamando essa rota via `pg_net` (URL estável `project--{id}.lovable.app`).

## 6. Migração

```sql
ALTER TABLE public.subscriptions
  ALTER COLUMN auto_renew SET DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
```

Data update (feito via ferramenta insert após a migração):
```sql
UPDATE public.subscriptions SET auto_renew = false WHERE auto_renew = true;
```

Colunas `asaas_subscription_id` e `next_charge_at` permanecem no schema para reativar quando a tokenização for liberada.

## 7. Secret

- Gerar `REMINDERS_TOKEN` (32 chars) via `generate_secret` — usado só para autenticar o `pg_cron` chamando a rota de lembretes.

## Arquivos afetados (resumo)

- `src/lib/payments.functions.ts`
- `src/routes/api/public/webhooks/asaas.ts`
- `src/lib/admin-ops.functions.ts` (cancel)
- `src/components/payments/SubscribeDialog.tsx`
- `src/routes/_authenticated/perfil.$username.tsx`
- `src/routes/_authenticated/subscriptions.tsx`
- `src/routes/_authenticated/admin.subscriptions.tsx`
- `src/routes/api/public/hooks/subscription-reminders.ts` (novo)
- Migração SQL + `pg_cron` job
