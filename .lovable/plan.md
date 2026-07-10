## Plan

1. **New** `src/routes/_authenticated/settings.chat-settings.tsx`
   - Route `/_authenticated/settings/chat-settings`
   - `head()` "Configurações de Chat · Monetisexy", `noindex`
   - `beforeLoad` → redirect `/entrar` if no session
   - Header: back button + centered title "Configurações de Chat"
   - Body (`max-w-3xl mx-auto`, space-y):
     - Green tip banner (light green bg, lightbulb `Lightbulb` icon): "Aproveite o primeiro contato para se apresentar e oferecer uma mídia exclusiva de boas vindas"
     - Row with label "Habilitar mensagem de boas-vindas" + subtext "Sua mensagem de boas-vindas é enviada automaticamente aos novos assinantes" and a `Switch` (right-aligned)
     - When switch ON: show a textarea card with placeholder "Mín. 3 caracteres" and a decorative icon toolbar (image, mic, archive, smile, tag from `lucide-react`) — icons are visual only, no handlers
     - Full-width primary button "Salvar alterações" (rounded-full) — disabled unless switch is ON and message length ≥ 3; on click shows `toast.success("Alterações salvas")` (mock, no persistence)
   - Local `useState` for `enabled` and `message`

2. **Edit** `src/routes/_authenticated/settings.creator.tsx`
   - Change the "Configuração do chat" row from a `toast.info("Em breve")` button (or current href) to a `<Link to="/settings/chat-settings">`. Keep the row's existing icon and layout.
