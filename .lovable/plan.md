## Nova página `/settings/change-password`

Acessada ao clicar em "Alterar senha" em `/settings/myprofile`.

### Arquivos

**Criar** `src/routes/_authenticated/settings.change-password.tsx`
- Rota autenticada, `noindex`, título "Alterar Senha · Monetisexy"
- Header padrão (border-b, back button, título "Alterar Senha")

**Editar** `src/routes/_authenticated/settings.myprofile.tsx`
- Adicionar `to="/settings/change-password"` no `SettingsRow` "Alterar senha"

### Layout (seguindo o screenshot)

`main max-w-3xl mx-auto px-4 md:px-6 py-6 pb-28`:

1. **Senha atual** — largura total, `rounded-2xl bg-muted px-5 py-3`, `Input type="password"` sem borda/background, placeholder "Senha atual", `useState`.
2. **Grid 2 colunas** (`grid grid-cols-1 md:grid-cols-2 gap-3 mt-3`):
   - **Nova Senha** — mesmo padrão, placeholder "Nova Senha".
   - **Repetir a nova senha** — mesmo padrão, placeholder "Repetir a nova senha".

**Barra fixa "Salvar"** no rodapé: `fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3 z-20` com `Button` largura total `h-12 rounded-full`.

Botão desabilitado até: senha atual preenchida, nova senha ≥ 8 chars, e confirmação = nova senha.

onClick chama `supabase.auth.updateUser({ password: nova })`. Supabase não valida a senha atual, mas por UX exigimos que o usuário digite; em caso de erro mostra `toast.error` com mensagem. Em sucesso, `toast.success("Senha alterada")` e `router.history.back()`.

Sem mudanças de backend nem em outros arquivos.
