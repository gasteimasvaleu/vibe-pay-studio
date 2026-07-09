# Aba "Sequência de atividades" — layout

Adicionar o painel da subtab `Sequência de atividades` em `src/routes/_authenticated/my-monetisex-stats.tsx`. Coluna direita (`TopBadgeCard` + `PeriodTotalCard`) permanece igual.

## Renderização condicional
Expandir o `subTab === "Destaques" ? ... :` para um `switch`/ternário aninhado que também trata `"Sequência de atividades"` → `<SequenciaPanel />`. Demais subtabs continuam usando o fallback atual (Faturamento).

## `SequenciaPanel`
Empilha três blocos:
1. `StreakCallout`
2. `StreakStatsRow` (2 cards lado a lado)
3. `StreakDetailCard`

### `StreakCallout`
- Cartão largo `rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]`
- Ícone `Trophy` (lucide) + texto **"Poste e divulgue para continuar crescendo!"** em negrito
- À direita: botão redondo com `Info` que abre um `Popover` (shadcn `@/components/ui/popover`) com o texto explicativo do screenshot:
  > "Uma sequência é o número de dias seguidos em que você esteve ativo para seus seguidores. Depois de concluir uma ação, sua sequência aumentará em um dia. Você pode descansar por um dia consecutivo, mas apenas uma vez por semana sem perder sua sequência. Durante esse dia de folga, sua sequência será pausada e retomada no dia seguinte, quando você se tornar ativo novamente."
- `PopoverContent` com `bg-foreground text-background` (tooltip escuro), max-w-xs, texto pequeno.

### `StreakStatsRow`
Grid 2 colunas, gap 4:
- **Sequência atual** (destaque, `border-primary` mais grossa `border-2`): título centralizado, ícone `Sparkles` laranja + valor grande `1 dia` em `text-primary font-bold`. Clicável (`button`) — abre `Popover`/`Dialog` com o **calendário** (usar `Calendar` de `@/components/ui/calendar`, mês atual, dia atual com destaque laranja). Sem seleção real por ora.
- **Sequência mais longa**: mesmo layout mas ícone `CalendarDays` e borda comum.

### `StreakDetailCard`
- Cartão `rounded-2xl border bg-card p-5`
- Título: **"Sua sequência atual começou. 9 Jul, 2026"** (bold)
- Subtítulo: `text-muted-foreground` — "Durante esse período, você esteve ativo por 1 dia, com:"
- Linhas divididas por `border-t border-border`:
  - Postagens feitas — `1`
  - Respostas aos assinantes no chat — `Não`
  - Tempo em live — `0m`
  - Faturamento total — `R$ 0,00`
- Cada linha: `flex items-center justify-between py-4`, label à esquerda `text-foreground`, valor à direita em negrito.

## Dependências
- `Popover`, `PopoverContent`, `PopoverTrigger` de `@/components/ui/popover` (já existente no shadcn).
- `Calendar` de `@/components/ui/calendar` (já existente).
- Ícones novos do lucide: `Trophy`, `Sparkles`, `CalendarDays`.

## Fora do escopo
- Sem lógica real de streak / cálculo de datas — valores mockados como no screenshot.
- Sem seleção funcional no calendário.
