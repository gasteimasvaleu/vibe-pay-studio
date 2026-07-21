# Padronizar headers de Settings para background branco

Trocar `bg-card` por `bg-white` no `<header>` das seguintes 17 páginas de settings (as demais já estão brancas):

- settings.subscription.tsx
- settings.privacy-mail.tsx
- settings.two-factor.setup.tsx
- settings.two-factor.index.tsx
- settings.two-factor.verify.tsx
- settings.personal.tsx
- settings.privacy-options.tsx
- settings.muted.tsx
- settings.theme.tsx
- settings.language.tsx
- settings.device-management.index.tsx
- settings.device-management.removed.tsx
- settings.security.tsx
- settings.security-menu.tsx
- settings.restrictions.tsx
- settings.chat-settings.tsx
- settings.privacy.tsx

Alteração: `border-b border-border bg-card` → `border-b border-border bg-white` apenas no elemento `<header>` de cada arquivo. Nenhuma outra mudança.
