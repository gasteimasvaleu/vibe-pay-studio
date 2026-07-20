## Diagnóstico

A penalização do Asaas ("recurso temporariamente alterado para a URL informada no cabeçalho Location") indica que o endpoint `https://vibe-pay-studio.lovable.app/api/public/webhooks/asaas` está respondendo com **302/307 + Location** em vez de `200`.

Isso acontece porque o projeto agora tem domínio customizado (`monetisexy.com`) e o subdomínio `vibe-pay-studio.lovable.app` redireciona para o domínio principal. Webhooks do Asaas **não seguem redirects** — cada 3xx é contado como falha e após várias falhas o webhook é penalizado/pausado.

O handler em `src/routes/api/public/webhooks/asaas.ts` está correto (retorna 200 com token válido). O problema é puramente de URL configurada no painel do Asaas.

## Correção (no painel do Asaas, não no código)

1. Acessar Asaas → Integrações → Webhooks → "Monetisexy 2".
2. Trocar a URL de:
   - `https://vibe-pay-studio.lovable.app/api/public/webhooks/asaas`

   Para uma URL que responde 200 direto, nesta ordem de preferência:
   - **`https://monetisexy.com/api/public/webhooks/asaas`** (domínio final, mais estável e sem redirect)
   - Alternativa: `https://project--ccce3d77-bfc0-456e-8651-bd8cd55716dd.lovable.app/api/public/webhooks/asaas` (URL estável de produção do Lovable, imune a rename)
3. Salvar e clicar em **Reativar/Retomar** o webhook (a penalização precisa ser desfeita manualmente após corrigir a URL).
4. Reenviar os eventos pendentes na fila (o Asaas oferece botão "Reenviar" nos eventos com falha) — o handler é idempotente (dedupe por `event_id` em `asaas_events`), então reenvios são seguros.

## Verificação

- Testar com `curl -I -X POST https://monetisexy.com/api/public/webhooks/asaas` — deve retornar `401 unauthorized` (sem token), **não** `301/302/307`. Isso confirma que a URL responde direto sem redirect.
- Após reativar, acompanhar a fila do webhook no Asaas — os próximos eventos devem sair com `200 OK`.

## Observação sobre o evento recebido

O payload que você mostrou é `PAYMENT_OVERDUE` do pagamento `pay_jceii8j5115xhoxp` (unlock da publicação `2c3ea175-…`). Após corrigir a URL e reenviar, o handler vai marcar o `publication_unlocks` correspondente como `cancelled` automaticamente (via `TERMINAL_CANCELLED`).

## Não é necessário mudar código

Nenhuma edição em `src/routes/api/public/webhooks/asaas.ts` — o handler já está correto. A ação é 100% de configuração no painel do Asaas.
