Ajustar o calendário da aba "Sequência de atividades" para que ele ocupe a largura total do card, mantendo os botões dos dias pequenos.

No componente `StreakCalendarCard` em `src/routes/_authenticated/my-monetisex-stats.tsx`:

1. **Tornar o calendário largura total do card**: trocar `className="p-3 pointer-events-auto w-fit mx-auto [--cell-size:1.25rem]"` por `w-full` (removendo o `w-fit` centralizado).
2. **Evitar que os botões dos dias estiquem gigantes**: passar `classNames` para o componente `Calendar` para que cada linha de semana use `grid grid-cols-7` com `gap-2`/`gap-4`, e as células de dia tenham tamanho fixo baseado em `--cell-size` (por exemplo `1.25rem` ou `1.5rem`) em vez de `h-full w-full`.
3. **Resultado esperado**: o calendário preenche a área do card, mas cada botão de dia permanece pequeno (≈20–24px), com o espaço extra distribuído entre as colunas do grid.
4. **Verificar visualmente** no preview se o calendário agora ocupa a largura do card sem botões enormes.

Escopo: somente o calendário da aba "Sequência de atividades".