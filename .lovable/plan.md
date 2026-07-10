## Plan

1. **New** `src/routes/_authenticated/settings.language.tsx`
   - Route `/_authenticated/settings/language`
   - `head()` "Idioma · Monetisexy", `noindex`
   - `beforeLoad` → redirect `/entrar` if no session
   - Header: back button + centered title "Idioma"
   - Body (`max-w-3xl mx-auto`):
     - Rounded pill container with floating label "Escolha seu idioma" and a shadcn `Select` (from `@/components/ui/select`) inside showing current language with flag emoji + name (default: 🇧🇷 Português)
     - Options: 🇺🇸 Inglês, 🇧🇷 Português, 🇪🇸 Espanhol
   - Bottom full-width rounded-full "Salvar" button; disabled unless selected value differs from initial; on click `toast.success("Idioma atualizado")` and reset initial (mock, no persistence)
   - Local `useState` for initial + selected language

2. **Edit** `src/routes/_authenticated/settings.creator.tsx`
   - Add `to="/settings/language"` to the "Idioma" `SettingsRow`.
