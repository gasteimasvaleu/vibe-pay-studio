Ajustar o calendário da aba "Sequência de atividades" para deixar os botões dos dias bem menores e mais proporcionais ao card.

Alterações em `src/routes/_authenticated/my-monetisex-stats.tsx`, no componente `StreakCalendarCard`:

1. **Diminuir o tamanho base das células**: sobrescrever a variável `--cell-size` do calendário de `2rem` para `1.5rem` (ou menor, conforme ajuste final) via `className` no `<Calendar>`.
2. **Impedir que o calendário estique horizontalmente**: trocar `w-full` por `w-fit` e centralizar com `mx-auto` dentro do card, para que os dias fiquem compactos ao invés de se espremarem para ocupar toda a largura da coluna `md:col-span-2`.
3. **Manter a aparência do card**: card continua com `rounded-2xl`, borda e fundo; apenas o conteúdo do calendário fica menor e centralizado.
4. **Verificar visualmente** no preview se os botões dos dias ficaram de tamanho agradável (células próximas de ~24px), ajustando a variável caso ainda fiquem grandes ou pequenos demais.

Escopo: somente o calendário da aba "Sequência de atividades"; nenhuma outra aba ou funcionalidade será alterada.