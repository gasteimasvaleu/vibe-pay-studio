## Ajuste da cor do botão de ação do publisher

### Contexto
O botão fixo no rodapé da tela `/publisher` está usando gradiente laranja/rosa. O usuário selecionou o botão "Continuar" (Step 1) e quer que o botão ativo use o roxo padrão do app em todos os steps.

### O que será alterado
- `src/routes/_authenticated/publisher.tsx`

### Mudanças
1. **Step 1 — botão "Continuar"**: trocar o gradiente laranja por um fundo roxo sólido/gradiente usando o token `--color-primary` do app (roxo/lilás padrão do tema).
2. **Step 2 — botão "Postar"**: aplicar a mesma cor roxa padrão, mantendo o estado `disabled` e o loading "Postando...".
3. **Manter estados**: preservar regras de `disabled`, opacidade e texto branco.

### Não será alterado
- Botões dos dialogs "Avançar" e "Aplicar" (preço/agendamento) — fora do escopo "steps do publisher".
- Lógica de upload, publicação ou estado dos steps.

### Resultado esperado
Ambos os botões do rodapé (Continuar no step 1 e Postar no step 2) aparecerão na cor roxa padrão do app quando ativos/habilitados.