# Restringir página de perfil ao modo creator

## Contexto

Hoje, `account_type` no `profiles` é a única fonte que distingue "assinante puro" de "creator". Não existe (ainda) troca de modo em runtime — um creator alternando para modo assinante continua com `account_type = 'creator'` no banco. Portanto:

- **Assinante puro** = `profiles.account_type === 'subscriber'`
- **Creator (mesmo quando visualizando como assinante)** = `profiles.account_type === 'creator'`

A `BottomNav` já lê `account_type` e mostra a versão de 5 colunas (com botão central "Postar") para creators e a versão de 4 colunas para assinantes. Nenhuma mudança necessária lá — o requisito "quando o modo assinante for criado via conta creator, mostrar a navbar do creator" já é atendido, porque a conta continua sendo creator.

## Mudança

### `src/routes/_authenticated/perfil.$username.tsx`

No `beforeLoad`, após obter o usuário logado, buscar também o `account_type` do próprio viewer (`profiles` do `userData.user.id`). Se for `subscriber`, `throw redirect({ to: "/dashboard" })` antes de qualquer outra consulta.

Fluxo final do `beforeLoad`:

1. `supabase.auth.getUser()` → sem user, redireciona pra `/entrar` (já existe).
2. Buscar `account_type` do viewer. Se `'subscriber'` → `redirect('/dashboard')`.
3. Continuar com a busca do perfil de `params.username` (código atual inalterado).

Nenhum outro arquivo precisa mudar. `BottomNav` e `dashboard.tsx` continuam iguais.

## Fora de escopo

- Implementar troca de modo (creator ↔ assinante) em runtime — não solicitado.
- Novos campos no banco (ex.: `created_from_creator`) — desnecessário com o critério escolhido.
