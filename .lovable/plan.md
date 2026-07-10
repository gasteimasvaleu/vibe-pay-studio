## Plan

1. **New** `src/routes/_authenticated/settings.theme.tsx`
   - Route `/_authenticated/settings/theme`
   - `head()` "Tema · Monetisexy", `noindex`
   - `beforeLoad` → redirect `/entrar` if no session
   - Header: back button (left) + centered title "Tema"
   - Body: single row with label "Modo noturno" + dynamic description ("Interface com cores claras para melhor visibilidade durante o dia" when off / "Interface com cores escuras para melhor conforto visual à noite" when on) + `Switch`
   - Behavior: on toggle, add/remove `dark` class on `document.documentElement` and persist to `localStorage["theme"]` (`"dark"` | `"light"`)
   - Read initial state inside `useEffect` (guard SSR) from `localStorage` / `document.documentElement.classList.contains("dark")`

2. **New** `src/components/theme-init.tsx` (client-only tiny component) that applies the persisted theme on mount, mounted once inside `src/routes/__root.tsx` shell so the `dark` class survives navigation and reloads.

3. **Edit** `src/routes/_authenticated/settings.creator.tsx`
   - Add `to="/settings/theme"` to the "Tema" `SettingsRow`.
