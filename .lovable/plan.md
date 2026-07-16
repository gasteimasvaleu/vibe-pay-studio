## Diagnóstico

Hoje o botão "Excluir conta" abre o dialog, mas ao clicar em **Continuar** o `handleConfirmDelete` só chama `toast.info("Em breve")`. **Não há exclusão real.**

## Objetivo

Implementar exclusão de conta de verdade: apagar o usuário em `auth.users` (o que remove em cascata `profiles` e demais dados via FKs `ON DELETE CASCADE`), encerrar a sessão e mandar o usuário para a home.

## Alterações

**1. Nova server function `src/lib/account.functions.ts`**

- `deleteMyAccount` = `createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(...)`.
- Handler:
  - Carrega `supabaseAdmin` com `await import("@/integrations/supabase/client.server")`.
  - `await supabaseAdmin.auth.admin.deleteUser(context.userId)`.
  - Se erro, `throw new Error("delete_failed")`.
  - Retorna `{ ok: true }`.
- Como o usuário deleta a **própria** conta (identificada por `context.userId`), não há verificação adicional de role.

**2. `src/routes/_authenticated/settings.myprofile.tsx`**

- Importar `useServerFn` e `deleteMyAccount`.
- Novo estado `deleting`.
- Reescrever `handleConfirmDelete`:
  1. `setDeleting(true)`.
  2. `await deleteFn({})` — em erro: `toast.error("Não foi possível excluir a conta")`, `setDeleting(false)`, sair.
  3. `toast.success("Conta excluída")`.
  4. `await supabase.auth.signOut()`.
  5. `window.location.replace("/")` — recarrega o app já sem sessão (equivalente ao `handleSignOut` já usado no projeto).
- No dialog:
  - Botão **Continuar** vira destrutivo: `bg-destructive text-destructive-foreground hover:bg-destructive/90`, `disabled={deleting}`, texto `"Excluindo…"` durante loading.
  - Botão **Cancelar** `disabled={deleting}`.

## Observações

- FKs para `auth.users(id)` no schema (ex.: `profiles.user_id`) já estão com `ON DELETE CASCADE`, então excluir o usuário limpa os dados associados automaticamente. Não é preciso migração.
- `supabaseAdmin` fica exclusivamente dentro do handler (nunca no topo de `.functions.ts`), respeitando as regras de import.
