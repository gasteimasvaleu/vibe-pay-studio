## Objetivo
Criar a página `/settings/two-factor` (mock/UI apenas) e vincular ao botão "Autenticação de dois fatores" no menu de Segurança.

## Arquivos

**Novo:** `src/routes/_authenticated/settings.two-factor.tsx`
- Rota: `/_authenticated/settings/two-factor`
- `head()` com título "Autenticação de Dois Fatores · Monetisexy", `noindex`
- `beforeLoad` verificando `supabase.auth.getUser()` (mesmo padrão de `settings.change-password.tsx` e `settings.security-menu.tsx`)
- Layout seguindo o screenshot:
  - Header idêntico ao de security-menu (botão voltar → `router.history.back()`, título centralizado "Autenticação de Dois Fatores")
  - `main` com `max-w-3xl` centralizado
  - Card `rounded-2xl border border-border bg-card shadow-card p-5`:
    - Título "Status" (`font-bold text-foreground`)
    - Linha com bolinha vermelha (`h-2 w-2 rounded-full bg-destructive`) + texto "Não configurada"
    - Botão "Habilitar" full-width, `h-12 rounded-full bg-gradient-primary text-primary-foreground`
    - `onClick` do botão: `toast.info("Em breve")` (mock)

**Editado:** `src/routes/_authenticated/settings.security-menu.tsx`
- No array de itens do menu (linhas 76-79), trocar `{ label: "Autenticação de dois fatores" }` por `{ label: "Autenticação de dois fatores", to: "/settings/two-factor" }` para que o botão vire um `<Link>`.

## Observações
- Página é apenas UI (sem integração real com Supabase MFA); botão "Habilitar" mostra toast "Em breve".
- Nenhuma mudança de banco ou lógica de backend.
