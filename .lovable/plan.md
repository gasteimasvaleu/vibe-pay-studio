Refatorar `/settings/device-management` para permitir rota filha `/removed`.

1. **`src/routes/_authenticated/settings.device-management.tsx`** — substituir por layout mínimo: apenas `createFileRoute` com `beforeLoad` (auth check) e `component: () => <Outlet />`. Sem UI própria.

2. **`src/routes/_authenticated/settings.device-management.index.tsx`** (novo) — recebe todo o conteúdo atual da página device-management (header "Seus acessos", seções, cards, botões). Rota: `/_authenticated/settings/device-management/`.

3. **`settings.device-management.removed.tsx`** — sem alterações, agora renderiza sozinha.