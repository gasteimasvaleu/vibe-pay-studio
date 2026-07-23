# Renovação automática de assinaturas + E-mail de cobrança PIX

## Parte 1 — Renovação automática via Asaas Subscriptions

Asaas suporta nativamente via `POST /v3/subscriptions`: cria cobrança recorrente com `cycle` (MONTHLY/QUARTERLY/SEMIANNUALLY), aplica o mesmo split configurado hoje, e a cada vencimento gera automaticamente um novo `payment` que dispara os webhooks já tratados. Cancelamento via `DELETE /subscriptions/{id}`.

### UX do assinante
- Paga o **1º ciclo** normalmente (PIX ou cartão). Depois disso o Asaas cobra sozinho: cartão é debitado; PIX recebe novo QR/link.
- Botão **"Cancelar renovação"** em `/subscriptions` passa a cancelar de fato (mantém acesso até `current_period_end`).
- Card mostra "Renova automaticamente em DD/MM" ou "Acesso até DD/MM (renovação cancelada)".
- Checkout ganha linha "Renovação automática — cancele quando quiser".

### Backend / schema
1. **Migração** — em `subscriptions`: `asaas_subscription_id text`, `next_charge_at timestamptz`, `last_payment_id text` + índice em `asaas_subscription_id`.
2. **`src/lib/asaas.server.ts`** — `createAsaasSubscription`, `deleteAsaasSubscription`, `getAsaasSubscription`, `listSubscriptionPayments`. Mapeamento plano → cycle: mensal→MONTHLY, trimestral→QUARTERLY, semestral→SEMIANNUALLY.
3. **`src/lib/payments.functions.ts` — `createSubscriptionCheckout`**: cria row local `pending`, chama `createAsaasSubscription` com split 85/15, e para o 1º ciclo busca o payment criado automaticamente (via `listSubscriptionPayments`) para devolver `pixQrCode`/`invoiceUrl` (UI atual não muda). `externalReference` do payment: `subscription:{id}:cycle:{n}`.
4. **`src/routes/api/public/webhooks/asaas.ts`**:
   - `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` de `cycle:1` → ativa (fluxo atual).
   - `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` de `cycle:N>1` → estende `current_period_end` (+1 ciclo), atualiza `next_charge_at`, grava `last_payment_id`, cria `transactions` de renovação com split, credita `creator_wallets`, dispara e-mail PIX da Parte 2 quando aplicável.
   - `PAYMENT_OVERDUE` → `status=past_due` (sem cancelar).
   - `SUBSCRIPTION_INACTIVATED` → `status=cancelled`.
5. **`src/lib/monetization.functions.ts` — `cancelSubscription`**: mantém `auto_renew=false`+`cancelled_at` e chama `deleteAsaasSubscription` (idempotente, ignora 404).

### Frontend
- `/subscriptions.tsx`: texto do card muda conforme `auto_renew`/`cancelled_at`; adiciona confirm dialog explicando que acesso continua até fim do ciclo.
- Dialog de assinatura no perfil: linha "Renovação automática".

### Migração de assinaturas existentes
**Grandfather** — assinaturas atuais continuam no modelo antigo até vencer; ao reassinar, entram no novo fluxo. Zero risco de cobrança duplicada.

## Parte 2 — E-mail com QR Code PIX via Resend

Toda cobrança PIX gerada (1º ciclo, renovações automáticas, e futuras compras avulsas se quisermos habilitar) manda e-mail ao assinante com QR + copia-e-cola + link do Asaas + vencimento.

### Requisitos
- Conector **Resend** (via `standard_connectors--connect`) — se ainda não houver conexão, abrir o card de conexão antes de habilitar o envio.
- Domínio verificado no Resend (`no-reply@monetisexy.com` idealmente); enquanto não estiver, usar `onboarding@resend.dev` só para testes.

### Backend
1. **`src/lib/email.server.ts`** — helper `sendEmail({ to, subject, html })` chamando o gateway `https://connector-gateway.lovable.dev/resend/emails` com `LOVABLE_API_KEY` + `RESEND_API_KEY`.
2. **`src/lib/emails/pix-invoice.tsx`** — template HTML responsivo:
   - Header roxo com logo/nome "Monetisexy".
   - Título "Sua cobrança PIX está pronta".
   - Bloco branco com nome do creator, plano, valor, vencimento.
   - QR code renderizado como `<img>` (base64 vindo do Asaas: `payment.pixQrCode.encodedImage`).
   - Campo copia-e-cola em `<code>` com botão "Copiar" (via mailto instrução textual — botão real só no link web).
   - Botão CTA "Abrir cobrança" → `invoiceUrl` do Asaas.
   - Rodapé com aviso de expiração, suporte e link para `/centro-e-seguranca`.
3. **`sendPixInvoiceEmail(paymentId)`** — busca `payment_intents`/`payments`, monta contexto e chama `sendEmail`. Idempotente por `payment_id`.
4. **Disparos automáticos**:
   - Ao criar 1º ciclo em `createSubscriptionCheckout` (após ter `pixQrCode`).
   - No webhook, ao processar renovação (quando novo payment PIX é criado — evento `PAYMENT_CREATED` da subscription).
5. **Preferências**: respeitar `email_preferences.transactional` (se `false`, não envia).

### Dashboard admin (`/admin/emails`)
Nova aba dentro do `/admin` existente:
- **Configurações**: status da conexão Resend (linked/not linked), domínio remetente, toggle global "Enviar cobranças PIX por e-mail".
- **Preview do template**: renderiza o `pix-invoice.tsx` com dados fake para o admin conferir o layout antes de ativar.
- **Botão "Enviar teste"**: manda o template para o próprio e-mail do admin logado.
- **Log**: últimas 50 tentativas de envio (nova tabela `email_log`: `id`, `payment_id`, `to`, `template`, `status`, `provider_message_id`, `error`, `sent_at`) — com filtros por status.
- **Reenviar**: por linha do log, botão para reenviar o mesmo e-mail.

### Schema
- `email_log` — tabela nova, RLS: apenas admin via `has_role`.
- Setting global em nova tabela `app_settings` (`key text pk`, `value jsonb`) para o toggle "pix_email_enabled". RLS: leitura para `authenticated`, escrita só admin.

## Testes (sandbox Asaas + Resend)
1. Assinatura mensal PIX → recebe e-mail com QR → paga → confirma ativação.
2. Simular `PAYMENT_CREATED` do 2º ciclo → recebe novo e-mail; simular `PAYMENT_CONFIRMED` → período estendido, split registrado.
3. Cancelar via UI → `DELETE /subscriptions` no Asaas; acesso mantido até `current_period_end`; nenhum novo e-mail enviado.
4. `PAYMENT_OVERDUE` → status `past_due`.
5. Preview e "Enviar teste" no `/admin/emails` funcionam sem cobrança real.

## Fora do escopo
- Recorrência para tips/PPV/Paid DM/chamadas.
- Upgrade/downgrade proporcional de plano.
- E-mails de recibo, "obrigado", ou marketing (só a cobrança PIX transacional entra agora).
