## Objetivo

Tornar a página `/settings/change-password` funcional de verdade — verificando a senha atual e aplicando as **mesmas regras de senha do cadastro** — e adicionar os botões **Salvar** e **Cancelar** no padrão das outras páginas de settings.

## Regras de senha (idênticas ao cadastro)

- Mínimo de 8 caracteres
- Pelo menos um número
- Pelo menos uma letra minúscula **e** uma maiúscula
- Pelo menos um caractere especial (`!@#$%^&*()_+-=[]{};':"\|,.<>/?\`~`)

## Alterações

**`src/routes/_authenticated/settings.change-password.tsx`**

1. **Extrair as regras** — replicar o `useMemo` de `rules` do `cadastro.tsx` aplicado sobre `next`; `passwordValid = Object.values(rules).every(Boolean)`.
2. **Renderizar `PasswordRules` embaixo do campo "Nova Senha"** — copiar o componente `PasswordRules` e o ícone `Check` do `cadastro.tsx` para dentro deste arquivo (mesmo visual: checkbox roxo quando ok, cinza quando não).
3. **Expor email no context** — `beforeLoad` retorna `email` do usuário para uso no handler.
4. **`handleSave`**:
   - Guard: `current` não vazio, `passwordValid`, `confirm === next`.
   - Reautenticar: `supabase.auth.signInWithPassword({ email, password: current })`. Se erro → `toast.error("Senha atual incorreta")` e sair.
   - `supabase.auth.updateUser({ password: next })`. Em sucesso: `toast.success("Senha alterada")`, limpa os três campos, `router.history.back()`.
5. **Botões Salvar/Cancelar (padrão)**:
   - Remover a barra fixa (`fixed bottom-0 …`) e o `pb-28` do `main`.
   - Dentro do `main`, `<div className="flex flex-col gap-3 pt-2">` com dois botões `w-full bg-primary text-primary-foreground hover:bg-primary/90`:
     - **Salvar** — `disabled={!canSubmit}`, texto `"Salvando…"` no loading. `canSubmit = current.length > 0 && passwordValid && confirm === next && !loading`.
     - **Cancelar** — limpa os três inputs; `disabled` quando todos vazios ou durante loading.

Sem mudanças em schema, server functions ou outras páginas.
