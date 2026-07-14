## Problema
Ao submeter o login sem e-mail/senha, o Supabase retorna `"missing email or phone"`. O `getAuthErrorMessage` (em `src/lib/auth.ts`) não mapeia essa string, então cai no fallback e exibe o texto em inglês, mencionando "phone" — que não existe no fluxo.

## Correção (frontend apenas)

### `src/lib/auth.ts` — `getAuthErrorMessage`
Adicionar mapeamentos, antes do fallback:
- `"missing email"` / `"missing email or phone"` → `"Informe seu e-mail e senha."`
- `"email"` + `"invalid"` → `"E-mail inválido."`
- Manter os mapeamentos atuais (`invalid login credentials`, `already registered`, `password`).

### `src/routes/index.tsx` — validação prévia no `handleSubmit`
Antes de chamar `signInWithEmail`, se `email.trim() === ""` ou `password === ""`, setar `setErrorMsg("Informe seu e-mail e senha.")` e retornar — evita ida ao servidor e garante mensagem consistente em PT-BR.

## Fora do escopo
Nenhuma mudança em backend, schema ou outras telas.

## Verificação
- Submeter form vazio → mostra "Informe seu e-mail e senha.".
- Submeter com credenciais erradas → mostra "E-mail ou senha inválidos.".
- `bun run build:dev`.
