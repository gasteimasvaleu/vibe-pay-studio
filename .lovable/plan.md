## Problema

Os tokens no `src/styles.css` são `oklch(...)`, não HSL. Envolver com `hsl(var(--foreground))` gera um valor CSS inválido, que os navegadores descartam — por isso os textos do carrossel continuam invisíveis.

## Correção

Em `src/components/feed/CircularSteps.tsx`, trocar `hsl(var(--token))` por `var(--token)` direto (o valor já é uma cor completa):

- `colorTitle`: `hsl(var(--foreground))` → `var(--foreground)`
- `colorSubtitle`: `hsl(var(--primary))` → `var(--primary)`
- `colorDescription`: `hsl(var(--muted-foreground))` → `var(--muted-foreground)`
- `colorArrowBg`: `hsl(var(--muted))` → `var(--muted)`
- `colorArrowFg`: `hsl(var(--foreground))` → `var(--foreground)`
- Borda das imagens: `1px solid hsl(var(--border))` → `1px solid var(--border)`
- Ponto inativo: `hsl(var(--muted-foreground) / 0.3)` → `color-mix(in oklab, var(--muted-foreground) 30%, transparent)`

## Fora de escopo
Nenhuma outra mudança — só substituir a sintaxe inválida.
