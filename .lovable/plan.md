## Objetivo
Criar página `/settings/privacy` (UI mock) com o menu de 3 itens do screenshot e ligar ao item "Privacidade" em `settings.creator.tsx`.

## Arquivos

**Novo:** `src/routes/_authenticated/settings.privacy.tsx`
- Rota: `/_authenticated/settings/privacy`
- `head()`: título "Privacidade · Monetisexy", `noindex`
- `beforeLoad`: `supabase.auth.getUser()` → redirect `/entrar` se sem sessão
- Layout no mesmo padrão de `settings.security-menu.tsx`:
  - Header com botão voltar (`router.history.back()`) + título "Privacidade"
  - `main max-w-3xl mx-auto px-4 md:px-6 py-6`
  - Card `rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border shadow-card` com 3 botões (mock, `toast.info("Em breve")` no clique):
    - "Configurações de privacidade"
    - "Configurações de envio de e-mails"
    - "Perfis silenciados"

**Editado:** `src/routes/_authenticated/settings.creator.tsx` (linhas 106–109)
- Adicionar `to="/settings/privacy"` ao `SettingsRow` "Privacidade" para virar link.

## Observações
- Apenas UI mock; nenhum fluxo real.
