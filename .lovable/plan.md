
## Objetivo

Tornar a página `/settings/privacy-mail` verdadeiramente funcional ponta a ponta: além de salvar as preferências (já funciona), garantir que **cada uma das 5 categorias de e-mail dispare de verdade** e que os **templates sejam editáveis pelo admin** no dashboard, sem precisar mexer em código.

## Estado atual (verificado)

- `settings/privacy-mail` já persiste preferências em `email_preferences` via `updateEmailPreference` — a UI funciona.
- `email.server.ts` já envia via gateway Resend e respeita `can_send_email` (master switch + por tipo).
- `email-events.server.ts` já implementa 4 dos 5 gatilhos:
  - `post_sales` — em `notifyPublicationUnlock`
  - `content_purchase` — em `notifyPublicationUnlock` e `notifyChatUnlock`
  - `subscription_sales` — em `notifySubscriptionActive`
  - `free_to_paid` — em `notifyFreeToPaid`
  - `creator_referrals` — **não existe** (TODO no código, falta coluna `referred_by`)
- Templates HTML estão hardcoded em `email-templates.server.ts` e não têm gestão pelo admin.
- É necessário confirmar se os hooks `notify*` estão sendo chamados nos pontos de pagamento/promoção (webhook Asaas, `wallet-pay`, veriff-decision, promoção free→creator).

## Escopo

### 1. Tabela de templates editáveis

Nova migração:

```text
public.email_templates
  kind         email_kind_enum PK   -- free_to_paid | post_sales | subscription_sales | content_purchase | creator_referrals
  subject      text NOT NULL
  body_html    text NOT NULL        -- HTML do miolo, com variáveis {{var}}
  updated_by   uuid NULL
  updated_at   timestamptz DEFAULT now()
```

- GRANTs: `SELECT/INSERT/UPDATE` para `authenticated`; `ALL` para `service_role`.
- RLS: apenas admins (`has_role(auth.uid(),'admin')`) leem/gravam.
- Seed com os textos atuais de `email-templates.server.ts` para cada `kind`.

### 2. Renderização por template do banco

- Refatorar `email-templates.server.ts`:
  - Manter `shell()` (chrome com logo + rodapé de preferências).
  - Nova função `renderTemplate(kind, vars)` que:
    1. Busca `subject` + `body_html` em `email_templates` (via `supabaseAdmin`).
    2. Substitui placeholders `{{nomeVar}}` de forma simples (escape básico contra HTML).
    3. Retorna `{ subject, html: shell(subject, body) }`.
  - Fallback estático: se linha ausente, usa o texto hardcoded atual (não quebra envios).
- Adaptar `email-events.server.ts` para chamar `renderTemplate("post_sales", { buyerName, amountBRL, publicationUrl })` etc.
- Variáveis por kind (documentadas na UI):
  - `post_sales`: `buyerName`, `amountBRL`, `publicationUrl`
  - `content_purchase`: `creatorName`, `amountBRL`, `publicationUrl`, `what` ("publicação"/"mensagem")
  - `subscription_sales`: `subscriberName`, `amountBRL`, `planLabel`
  - `free_to_paid`: `creatorName`, `creatorUrl`
  - `creator_referrals`: `referredName`, `creatorUrl`

### 3. Backend admin de templates

Novo `src/lib/admin-email-templates.functions.ts` (server functions, `requireSupabaseAuth` + verificação `has_role admin` via `context.supabase`):

- `listEmailTemplates()` → 5 linhas (kind, subject, body_html, updated_at).
- `getEmailTemplate({ kind })`.
- `updateEmailTemplate({ kind, subject, body_html })` — grava e seta `updated_by = context.userId`.
- `sendEmailTemplatePreview({ kind, to })` — renderiza com valores de exemplo e envia via `sendTransactionalEmail` (ignora `can_send_email` para preview — usa Resend direto).

### 4. UI admin

- Adicionar item "E-mails" (ícone `Mail`) no `NAV` de `src/routes/_authenticated/admin.tsx`.
- Nova rota `src/routes/_authenticated/admin.emails.tsx`:
  - Lista as 5 categorias com `label` + `descrição` (mesma copy da `privacy-mail`).
  - Seleção abre editor:
    - Campo `subject` (input).
    - Campo `body_html` (`Textarea` monoespaçada, altura grande).
    - Bloco "Variáveis disponíveis" com chips clicáveis que inserem `{{var}}`.
    - Painel de preview (iframe `srcDoc`) que renderiza `shell + body` com valores de exemplo em tempo real.
    - Botões: **Salvar**, **Enviar teste para meu e-mail**, **Restaurar padrão**.
  - Toasts de sucesso/erro; badge com data do último `updated_at`.

### 5. Gatilho faltante `creator_referrals`

- Adicionar coluna `profiles.referred_by uuid NULL` + índice.
- No `handle_new_user` (ou em migração separada), preencher `referred_by` quando o metadata do signup trouxer `ref`.
- Em `notifyFreeToPaid` (quando o perfil vira criador), também disparar `creator_referrals` para o `referred_by`, se houver.
- (A parte de capturar `?ref=` no signup fica fora do escopo desta tarefa — documentada em TODO no código.)

### 6. Verificação dos call sites de envio

Passar pelos handlers de pagamento aprovado e garantir que já chamam os `notify*`:

- `src/routes/api/public/webhooks/asaas.ts` (transições para `paid`)
- `src/lib/wallet-pay.functions.ts` (pagamentos via saldo)
- `src/routes/api/public/webhooks/veriff-decision.ts` / `onboarding.functions.ts` (promoção free→creator → `notifyFreeToPaid`)

Onde faltar, adicionar o `await notifyXxx(id).catch(...)` sem bloquear o fluxo principal.

## Detalhes técnicos

- Escape de variáveis: função `escapeHtml()` simples aplicada a todo valor antes da substituição, para evitar XSS em nomes de usuário.
- Preview usa `sandbox="allow-same-origin"` no iframe, sem scripts.
- Rate-limit do "Enviar teste": no client, botão desabilita por 5s após clicar.
- Sem migração de dados: seed inicial preenche `email_templates` com os HTMLs atuais na mesma migração de `CREATE TABLE`.
- Nada muda para o usuário final na `/settings/privacy-mail` — ela continua controlando o opt-out.

## Entregáveis

- 1 migração (tabela + enum + RLS + grants + seed + coluna `referred_by`).
- `src/lib/email-templates.server.ts` refatorado para render dinâmico com fallback.
- `src/lib/admin-email-templates.functions.ts` (novo).
- `src/routes/_authenticated/admin.emails.tsx` (novo) + entrada no NAV.
- Ajustes em `email-events.server.ts` (novo kind `creator_referrals`) e nos call sites que faltarem.
