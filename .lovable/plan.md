## Ocultar navbars durante exibição de story

Quando o `StoryViewer` estiver aberto (em tela cheia), esconder `TopNav` e `BottomNav` do layout `_authenticated`.

### Alterações

- Criar `src/hooks/useFullscreenOverlay.ts`: pequeno store baseado em `useSyncExternalStore` que expõe `useFullscreenOverlay()` (boolean) e helpers `openOverlay()` / `closeOverlay()`.
- `src/components/feed/StoryViewer.tsx`: chamar `openOverlay()` quando `open` vira `true` e `closeOverlay()` quando fecha (via `useEffect` com cleanup).
- `src/routes/_authenticated/route.tsx`: ler `useFullscreenOverlay()` e renderizar `<TopNav />` e `<BottomNav />` condicionalmente (ocultos quando ativo). O `<Outlet />` continua renderizado.

Sem alterações de dados ou lógica de negócio.
