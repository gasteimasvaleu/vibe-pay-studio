## Plan

1. **New** `src/routes/_authenticated/settings.restrictions.tsx`
   - Route `/_authenticated/settings/restrictions`
   - `head()` "Assinantes restritos · Monetisexy", `noindex`
   - `beforeLoad` → redirect `/entrar` if no session
   - Header: back button (left), centered title "Assinantes restritos", info icon button (right) → opens modal
   - Body: centered muted text "Assinantes restritos não podem interagir com você e novas mensagens vindas dele não serão exibidas." (mock empty state)
   - `Dialog` modal:
     - Title "Assinantes restritos"
     - Bordered inner card with heading "O que ocorre ao restringir um perfil?" and ordered list:
       1. O assinante não pode mais interagir com você.
       2. Comentários dele não aparecem em suas publicações.
       3. Mensagens enviadas por ele não são recebidas por você.
       4. O assinante não é notificado sobre essa restrição.
     - Full-width primary rounded-full "Entendi" button that closes modal

2. **Edit** `src/routes/_authenticated/settings.creator.tsx`
   - Change the "Assinantes restritos" `SettingsRow` to add `to="/settings/restrictions"` (converts from mock button to Link).
