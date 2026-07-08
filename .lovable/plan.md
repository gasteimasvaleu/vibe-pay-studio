## Diagnóstico
O client Supabase quebra a página inteira porque `createClient("", "")` valida a URL na hora do `import` e lança `supabaseUrl is required.`. Como as env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` ainda não estão configuradas no ambiente, a home explode no boundary de erro.

## Correção
Tornar o client tolerante à ausência de env vars:

1. Em `src/integrations/supabase/client.ts`, só chamar `createClient` se **ambas** as env vars estiverem presentes. Caso contrário, exportar um **proxy** que:
   - Não quebra em `import` nem em acesso a propriedades.
   - Lança um erro claro em português somente quando alguém tentar **usar** o client (ex.: `supabase.auth.signInWithPassword(...)`).
   - Loga um `console.warn` explicando como configurar as variáveis.

2. Nenhuma outra mudança: rotas, UI e lógica de login continuam iguais. Assim que você preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em **Project Settings → Environment Variables**, o proxy passa a delegar para o client real automaticamente após o próximo reload.

## Verificação
- `bun run build`.
- Abrir a home e confirmar que ela renderiza normalmente mesmo sem env vars.
- Tentar submeter login sem env vars → mensagem de erro amigável no card, sem quebrar a página.
