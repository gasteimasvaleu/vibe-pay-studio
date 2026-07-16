
## Objetivo

Os switches em `/settings/privacy-mail` já persistem em `email_preferences` e o helper `sendTransactionalEmail` já respeita `can_send_email`. Falta o que dá "funcionalidade real" ponta-a-ponta: disparar emails nos eventos da plataforma passando pelo helper, para que os toggles efetivamente controlem envios (mesmo antes do Resend estar ligado, ficam gated e logados; assim que a chave for adicionada, começam a sair de verdade sem novas mudanças de código).

## O que será feito

1. **Gatilhos de envio via `sendTransactionalEmail`** — em cada ponto server-side já existente:
   - `post_sales` → após `publication_unlock` pago (em `payments.functions.ts` / reconciler `payments-reconcile.server.ts`, no ramo que marca unlock como `paid`). Destinatário: autor da publicação.
   - `content_purchase` → mesmo evento acima, destinatário: comprador (recibo da compra).
   - `subscription_sales` → após `subscription` ficar `active` (mesmos arquivos de pagamento + `wallet-pay.functions.ts` no ramo `subscription`). Destinatário: criador.
   - `free_to_paid` → quando `profiles.account_type` muda de `free_creator`/`subscriber` para `creator` (em `onboarding.functions.ts` / ponto que promove a conta). Destinatário: seguidores do criador (busca em `follows`, envio em lote com `Promise.allSettled`, gate individual pelo helper).
   - `creator_referrals` → quando um perfil indicado vira criador. Como ainda não existe coluna `referred_by`, este envio fica preparado atrás de um `TODO` claro (função utilitária pronta, chamada só quando o campo existir) — sem migration nova.

2. **Utilitário `src/lib/email-templates.server.ts`** com funções puras que retornam `{ subject, html }` para cada tipo (`postSaleEmail`, `contentPurchaseEmail`, `subscriptionSaleEmail`, `freeToPaidEmail`). HTML simples inline, com nome do criador/comprador, valor formatado em BRL e link para a publicação/perfil.

3. **Resolução de destinatário** — helper interno `resolveUserEmail(userId)` em `email.server.ts` que usa `supabaseAdmin.auth.admin.getUserById` para obter o email. Cacheado por chamada. Retorna `null` quando não houver email; nesse caso pula com log.

4. **Robustez** — todas as chamadas envolvidas em `try/catch` + `Promise.allSettled` para não quebrar o fluxo de pagamento se o envio falhar. Logs padronizados `[email] kind=... user=... status=...`.

5. **Sem novas tabelas nem colunas.** Nada muda no schema. Nenhuma migration.

## Arquivos afetados (edições)

- `src/lib/email.server.ts` — adicionar `resolveUserEmail`.
- `src/lib/email-templates.server.ts` — novo arquivo com templates.
- `src/lib/payments-reconcile.server.ts` — disparar post_sales + content_purchase + subscription_sales após marcar `paid`/`active`.
- `src/lib/wallet-pay.functions.ts` — mesmos disparos no fluxo carteira.
- `src/lib/onboarding.functions.ts` (ou local equivalente que promove a conta) — disparar free_to_paid para seguidores.
- Stub `creator_referrals` documentado em `email.server.ts` como TODO.

## Fora do escopo

- Configurar Resend / domínio verificado (feito depois pelo usuário; helper já pronto).
- Nova UI, novas migrations, mudanças em outros switches de privacidade.
- Retry/queue persistente de emails (fica um `console.error` por enquanto).

## Como validar depois

- Toggle OFF em `/settings/privacy-mail` para "Vendas de postagens" → simular um unlock pago → log deve mostrar `skipped reason=user_opted_out` para o criador; comprador ainda recebe se estiver ON.
- Toggle master `emails_enabled` OFF em `/settings/privacy-options` → nenhum envio para o usuário, independente das preferências.
