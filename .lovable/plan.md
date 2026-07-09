Ajustar `src/routes/_authenticated/feed.tsx` para que os cards do feed (coluna central) fiquem com a mesma largura dos cards da página individual de perfil, que usa `max-w-3xl` (~768px).

### Alterações

1. **Expandir o container geral do feed** de `max-w-7xl` para `max-w-[1400px]` no cabeçalho e no grid principal, garantindo espaço para a sidebar esquerda (220px), os cards centrais no tamanho do perfil, e a sidebar direita (300px).

2. **Limitar a coluna central a `max-w-3xl`** e centralizá-la com `mx-auto`, para que os cards do feed tenham exatamente a mesma largura máxima dos cards da página `/perfil/$username`.

3. **Manter** as sidebars, navegação, empty state, contraste/visibilidade já ajustados anteriormente.

### Fora de escopo

- Não alterar onboarding/Veriff.
- Não adicionar posts reais (continua mostrando empty state).
- Não mexer na página de perfil.

Após aprovado, aplico a mudança e verifico o preview em desktop.