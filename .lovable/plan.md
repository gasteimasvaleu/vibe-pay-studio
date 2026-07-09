# Calendário inline abaixo do card de detalhes

Adicionar um cartão de calendário estático ao final do `SequenciaPanel`, logo depois do `StreakDetailCard`, replicando o screenshot (mês atual com o dia 9 destacado em laranja).

## Alterações em `src/routes/_authenticated/my-monetisex-stats.tsx`

1. Novo componente `StreakCalendarCard`:
   - Wrapper `rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]`.
   - Usa `Calendar` de `@/components/ui/calendar` em `mode="single"`, `selected={new Date(2026, 6, 9)}`, `defaultMonth={new Date(2026, 6, 9)}`, `className="p-3 pointer-events-auto w-full"`, `showOutsideDays={false}`.
   - Sem `onSelect` (visual only).

2. Em `SequenciaPanel`, adicionar `<StreakCalendarCard />` como último filho.

3. Remover o `Popover` que envolve o card "Sequência atual" em `StreakStatsRow` — o calendário passa a ficar sempre visível abaixo. O card volta a ser um `div` estático (sem interação por enquanto).

## Fora do escopo
- Sem marcação real de dias ativos (só o "hoje" selecionado).
- Sem navegação/estado do mês exibido.
