## Objetivo
Transformar o título "Conversas" da sidebar `/chat` em um elemento visual menor, dentro de um card com aparência de botão, mantendo a hierarquia e acessibilidade.

## Escopo
- Apenas o header da sidebar do chat (`src/routes/_authenticated/chat.tsx`, linha 152-153).
- Não alterar funcionalidade, rotas, dados ou outros componentes.

## Alterações propostas
1. **Diminuir a fonte** do título de `text-2xl font-bold` para `text-sm font-semibold` (ou `text-base font-semibold`, ajustável no build).
2. **Envolver o título em um card/botão** usando o componente `Card` (ou `Button` como visual) do design system do app, com:
   - Fundo `bg-card` e borda `border`/`border-border`.
   - `rounded-xl` e padding compacto (`px-3 py-1.5`).
   - Sombra sutil ou estado hover leve para reforçar a aparência de botão.
3. **Preservar semântica**:
   - Manter o texto como `<h1>` semanticamente, mas estilizado visualmente como card-botão, ou usar `<div>` com `role="button"` se for clicável.
   - Como o título não é clicável atualmente, manter como `<h1>` estilizado é suficiente.
4. **Ajustar alinhamento** do header para que o novo card-botão fique alinhado aos ícones de ação ao lado.

## Resultado esperado
- Título "Conversas" menor e elegante.
- Visual de card/botão discreto, integrado ao restante da sidebar.
- Nenhuma mudança de comportamento funcional.

## Validação
- Verificar visualmente no preview que o título ficou menor e dentro do card.
- Confirmar que não há regressão no layout da sidebar em desktop e mobile.