## Objetivo

Bloquear o acesso à página `/perfil/$username` quando o perfil pertence a uma conta cadastrada diretamente como assinante (não-creator). O usuário continua existindo no sistema, mas não expõe página pública de perfil.

## Alteração

Em `src/routes/_authenticated/perfil.$username.tsx`, no `beforeLoad`, logo após buscar o `profile` do Supabase:

- Se `profile` não existe → `throw notFound()` (já ocorre).
- **Novo**: se `profile.account_type !== 'creator'` → `throw notFound()`.

Isso mantém consistência com a mudança anterior (bottom nav e fluxo diferenciado por `account_type`), garantindo que apenas contas criadas via assinatura creator tenham página individual de perfil. Assinantes puros retornam a tela padrão de "Perfil não encontrado".

## Fora de escopo

- `/profile/$username` (perfil próprio do usuário logado — dashboard pessoal) permanece acessível a todos.
- Nenhuma alteração em navegação, backend ou dados.
