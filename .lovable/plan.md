## Objetivo
Conectar o app a um projeto Supabase existente configurando manualmente as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, e criar o client Supabase para uso no frontend.

## Passos

1. **Instalar o SDK**
   - `bun add @supabase/supabase-js`

2. **Criar o client Supabase**
   - Novo arquivo `src/integrations/supabase/client.ts` que instancia `createClient` lendo:
     - `import.meta.env.VITE_SUPABASE_URL`
     - `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
   - Configuração: `auth: { persistSession: true, autoRefreshToken: true, storage: localStorage }`.
   - Lança erro claro em dev se as variáveis não estiverem definidas.

3. **Declarar as variáveis de ambiente**
   - Criar `.env.example` documentando as duas chaves.
   - Você mesmo vai preencher os valores reais como **Secrets** do projeto Lovable (via botão de secrets/variáveis de ambiente na UI) — não commitamos valores reais no repositório. Vou te dar os nomes exatos para colar:
     - `VITE_SUPABASE_URL` = URL do projeto (ex.: `https://xxxx.supabase.co`)
     - `VITE_SUPABASE_PUBLISHABLE_KEY` = chave `anon` / `publishable` do painel Supabase → Settings → API

4. **Não** vou implementar autenticação, tabelas, nem alterar o card de login neste passo — só a conexão base. Assim que estiver conectado, decidimos o próximo passo (auth real, `profiles`, etc.).

## Detalhes técnicos
- Chave usada é a **publishable/anon** (segura no cliente). Nunca a `service_role`.
- Como o projeto é TanStack Start com SSR, o client é usado apenas em código de browser (componentes/hooks). Server functions futuras usarão um client próprio server-side.
- Sem alterações em rotas, UI, ou lógica de negócio.

## Pergunta
Você quer que eu já solicite a você inserir os valores de `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` via o formulário seguro de Secrets da Lovable, ou você prefere configurar manualmente e só me avisar depois?
