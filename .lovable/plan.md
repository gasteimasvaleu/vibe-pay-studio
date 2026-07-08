## Bug
No `LoginCard` do hero (`src/routes/index.tsx`, linha 49-50), após `signInWithEmail` o código chama `navigate({ to: "/" })` em vez de usar `routeAfterAuth`. Resultado: você fica na home mesmo logado.

Os outros pontos de login (`/entrar`, `/cadastro`) já foram atualizados; só esse ficou pra trás.

## Correção
Em `src/routes/index.tsx`:
- Importar `routeAfterAuth` de `@/lib/auth`.
- Substituir `navigate({ to: "/" })` por `await routeAfterAuth(navigate)` dentro do `handleSubmit` do `LoginCard`.

Só isso — 2 linhas.