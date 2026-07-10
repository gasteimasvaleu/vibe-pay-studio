## Plan

1. **New** `src/routes/_authenticated/settings.muted.tsx`
   - Route `/_authenticated/settings/muted`
   - `head()` "Perfis silenciados · Monetisexy", `noindex`
   - `beforeLoad` → redirect `/entrar` if no session
   - Header: back button (left), title "Perfis silenciados" (center), info icon button (right, `lucide-react` `Info` or `AlertCircle`) that opens a modal
   - Body (centered text):
     - "Mensagens de perfis silenciados não geram notificações e continuam disponíveis no filtro \"Silenciados\"."
     - "Você ainda não silenciou nenhum perfil." (empty state — mock, no data fetch)
   - Modal (shadcn `Dialog`) triggered by info icon:
     - Title "Perfis silenciados"
     - Bordered inner card with heading "O que acontece quando você silencia um perfil?" and ordered list:
       1. Mensagens recebidas não serão notificadas.
       2. Elas continuarão disponíveis no filtro "Silenciados".
       3. O assinante não será avisado — essa ação é privada e só você saberá.
     - Full-width primary button "Entendi" that closes the modal
   - Local `useState` for modal open state

2. **Edit** `src/routes/_authenticated/settings.privacy.tsx`
   - Add `to: "/settings/muted"` to the "Perfis silenciados" item so it links instead of showing "Em breve".
