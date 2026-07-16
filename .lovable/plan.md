## Problema

O card do feed vazio está com textos quase invisíveis no tema claro porque o `CircularSteps` e o wrapper usam cores fixas pensadas só para fundo escuro (`text-white`, `text-white/75`, `#ffffff`, `rgba(255,255,255,0.75)`), e o card externo usa `bg-white/[0.04]` + `border-white/10` que somem sobre fundo claro.

## Correção

**1. `src/routes/_authenticated/feed.tsx`** — card externo do estado vazio:
- Trocar `bg-white/[0.04] border-white/10` por `bg-card border-border` (tokens semânticos que se adaptam ao tema).
- Título `text-white` → `text-foreground`.
- Descrição `text-white/75` → `text-muted-foreground`.
- Remover as props `colors` explícitas ao instanciar `CircularSteps` (deixar usar os defaults, que agora serão tokens).

**2. `src/components/feed/CircularSteps.tsx`** — defaults de cor:
- `colorTitle`: `#ffffff` → `hsl(var(--foreground))` (ou usar classe `text-foreground` e remover style inline).
- `colorSubtitle`: manter fúcsia (`hsl(var(--primary))` ou o roxo atual — legível nos dois temas).
- `colorDescription`: `rgba(255,255,255,0.75)` → `hsl(var(--muted-foreground))`.
- `colorArrowBg`: `rgba(255,255,255,0.08)` → `hsl(var(--muted))`.
- `colorArrowFg`: `#ffffff` → `hsl(var(--foreground))`.
- Borda das imagens (`rgba(255,255,255,0.12)`) → `hsl(var(--border))`.
- Ponto inativo do paginador (`rgba(255,255,255,0.2)`) → `hsl(var(--muted-foreground) / 0.3)`.
- Gradiente hover das setas e ponto ativo (fúcsia→roxo) permanece — é o accent da marca.

## Fora de escopo
- Cores dos outros cards do feed (welcome, publicações) — só o estado vazio foi reclamado.
- Trocar imagens placeholder ou reestruturar layout.
