## Problema

Toast: `new row violates row-level security policy for table "payment_intents"`.

`payment_intents` só tem policy de SELECT para admin. Nenhuma policy de INSERT. A função `recordIntent` insere usando o client autenticado do comprador (RLS aplica), então bate na barreira.

Essa tabela é infraestrutura interna (log de eventos Asaas), não pertence ao usuário. Não faz sentido dar `INSERT` para `authenticated` no Data API — seria uma superfície de escrita arbitrária.

## Correção

Fazer o INSERT com o client admin (service role, bypassa RLS) dentro do próprio server function.

### Mudança em `src/lib/payments.functions.ts`

Em `recordIntent`, ignorar o `supabase` do contexto e usar `supabaseAdmin`:

```ts
async function recordIntent(_supabase: any, args: { ... }): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("payment_intents")
    .insert({ ... })
    .select("id")
    .single();
  ...
}
```

Manter a assinatura `(_supabase, args)` para não mexer nos ~6 call-sites; o parâmetro fica ignorado.

Nenhuma migration necessária — a policy admin-read existente continua sendo suficiente porque a leitura é só para painel admin.

## Arquivos alterados

- `src/lib/payments.functions.ts` — `recordIntent` passa a usar `supabaseAdmin`.
