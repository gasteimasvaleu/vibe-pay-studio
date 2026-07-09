## Contexto

O painel do Veriff mostrou `500 Internal Server Error` no webhook de decisão (`/api/public/webhooks/veriff-decision`) na entrega das 07:00 (BRT). O payload é válido (`status: success`, `verification.id`, `code: 9001` = aprovado) e retentativas posteriores retornaram 200, mas o handler atual tem pontos frágeis que podem lançar exceções não capturadas e devolver 500 genérico ao Veriff (o que dispara retentativas e ruído no painel).

Pontos frágeis identificados em `src/routes/api/public/webhooks/veriff-decision.ts`:

1. **Sem try/catch global** — qualquer throw (parse, crypto, import dinâmico do `client.server`, cliente Supabase) vira 500 sem log útil.
2. **`timingSafeEqual` lança se os buffers tiverem tamanhos diferentes** — já há um guard, mas assinaturas com prefixo/caso inesperado podem passar do guard e lançar depois. Melhor envolver em try/catch e logar.
3. **`Buffer` global** — funciona com `nodejs_compat`, mas fica mais seguro importar explicitamente de `"buffer"` para evitar edge cases de bundle.
4. **Update Supabase sem checar linhas afetadas** — se nenhum profile bater com `vendorData`/`veriff_session_id`, hoje retorna 200 silenciosamente; queremos logar isso para diagnóstico, mas continuar retornando 200 (o Veriff não deve reentregar).
5. **Sem log do `verification.status` recebido** — dificulta debug de mapeamento.

## Plano

Editar apenas `src/routes/api/public/webhooks/veriff-decision.ts`:

1. Importar `Buffer` explicitamente de `"buffer"`.
2. Envolver todo o corpo do handler em `try/catch`; no `catch`, `console.error` com o erro real e retornar `200 "ok"` com um header `x-webhook-error: 1` (evita retries agressivos do Veriff enquanto ainda fica visível nos logs). Alternativa: manter 500 mas só após logar — decisão: **retornar 200 mesmo em falha interna e logar**, pois o Veriff reenvia em 500 e o estado real vem pelo polling do `verification-status` no cliente.
3. Envolver a comparação `timingSafeEqual` em try/catch defensivo.
4. Adicionar `console.log("[veriff webhook] decision", { id, status: verification.status, code: verification.code })` após parse bem-sucedido.
5. Após o update, logar contagem de linhas afetadas (`.select("user_id")` para saber se casou algum profile) e avisar quando `0 rows` (não é erro, só warn).
6. Ampliar o `statusMap` para incluir chaves conhecidas do Veriff v1 (`approved`, `declined`, `resubmission_requested`, `expired`, `abandoned`, `review`) — já estão presentes; confirmar.

Nenhum outro arquivo é alterado. Sem mudança de UI, schema ou server functions. O polling do cliente na tela `verificando` continua sendo a fonte de verdade para o usuário final.

## Verificação

- Build passa.
- Após deploy, reenviar o webhook pelo painel do Veriff (botão "Resend") e confirmar `200` + log com `decision`/`status` no server-function-logs.
