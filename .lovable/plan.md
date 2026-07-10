## Plan

1. **New** `src/routes/_authenticated/settings.privacy-mail.tsx`
   - Route `/_authenticated/settings/privacy-mail`
   - `head()` with title "Configurações de envio de e-mails · Monetisexy" and `noindex`
   - `beforeLoad` auth check → redirect `/entrar` if no session
   - `max-w-3xl mx-auto` layout with back button and centered title "Configurações de envio de e-mails"
   - 5 toggle rows (label + description + Switch), matching screenshot:
     - Perfil gratuito que se tornou pago
     - Vendas de postagens
     - Vendas por inscrições
     - Compra de conteúdo
     - Indicações de criador de conteúdo
   - Local `useState<Record<string, boolean>>` for toggles (mock, no persistence)

2. **Edit** `src/routes/_authenticated/settings.privacy.tsx`
   - Add `to: "/settings/privacy-mail"` to the "Configurações de envio de e-mails" item so it renders as `<Link>` instead of the "Em breve" toast.
