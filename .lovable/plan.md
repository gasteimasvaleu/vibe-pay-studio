## Corrigir cores do gráfico de engajamento

O gráfico está renderizando tudo em preto porque as cores foram passadas como `hsl(var(--primary))`, mas os tokens deste projeto (`src/styles.css`) são `oklch(...)` — envolver em `hsl()` gera cor inválida e o Recharts cai para preto.

### Alteração
Arquivo: `src/routes/_authenticated/my-monetisex-stats.tsx`, componente `EngajamentoChart`.

Substituir nos props do Recharts:
- `hsl(var(--primary))` → `var(--primary)` (linha e ponto de Faturamento — roxo)
- `hsl(var(--muted-foreground) / 0.5)` → `color-mix(in oklab, var(--muted-foreground) 50%, transparent)` (barras de Quantidade — cinza)
- `hsl(var(--muted-foreground))` → `var(--muted-foreground)` (ticks dos eixos)
- `hsl(var(--border))` → `var(--border)` (grid e eixos)
- `hsl(var(--popover))` / `hsl(var(--popover-foreground))` → `var(--popover)` / `var(--popover-foreground)` (tooltip)

Sem outras mudanças.

### Validação
Recarregar preview e confirmar que a linha aparece em roxo e as barras em cinza, como no screenshot enviado.