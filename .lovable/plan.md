## Objetivo
Mostrar um overlay de loading global durante a troca entre páginas do site inteiro, usando o mesmo elemento animado (GooeyLoader) já usado no KYC — porém em tamanho maior, já que hoje ele aparece pequeno demais.

## Escopo (frontend/apresentação apenas)

### 1. Novo componente `src/components/site/RouteTransitionOverlay.tsx`
- Usa `useRouterState({ select: s => s.status })` do `@tanstack/react-router`.
- Quando `status === "pending"` por mais de ~150ms (evita flash em navegações instantâneas), renderiza um overlay `fixed inset-0 z-[100]` com fundo `bg-white/85 backdrop-blur-sm` centralizando o `GooeyLoader`.
- Fade-in via `animate-fade-in` (utility já existente).
- Usa `role="status"` + `aria-live="polite"` e texto "Carregando..." em `text-neutral-700` abaixo do loader.
- Tamanho: `GooeyLoader` com `className="h-48 w-96 text-[22px]"` (hoje é `h-28 w-56 text-[14px]` no KYC — quase o dobro, ficando bem visível).

### 2. Registrar no `src/routes/__root.tsx`
- Importar e renderizar `<RouteTransitionOverlay />` dentro de `RootComponent`, ao lado de `TopBanner` / `SonnerToaster`, fora do `<Outlet />` para não desmontar durante a transição.

### 3. Ajuste no `GooeyLoader` (não mudar API, só permitir escalar bem)
- Nenhuma mudança de lógica. O componente já escala por `font-size` (em unidades `em`). O `text-[22px]` no wrapper aumenta proporcionalmente rail, blobs e blur.
- Opcional: no overlay, passar `primaryColor`/`secondaryColor` para tons roxo/fúcsia da marca fixos (`oklch(0.62 0.24 305)` e `oklch(0.72 0.20 330)`) para contraste consistente sobre fundo claro.

### 4. Não alterar
- Nenhuma rota, loader, server function, ou lógica de negócio.
- Overlays de páginas específicas (KYC verificando/aprovado) continuam usando o `GooeyLoader` embutido — o overlay global cobre apenas transições de rota.

## Verificação
- `bun run build:dev`.
- Navegação entre 2–3 rotas: overlay aparece durante a troca, com o loader visivelmente maior, e some ao completar.
