## Ajustar imagens do CircularSteps para formato 1:1 (quadrado)

### Problema
As imagens do componente `CircularSteps` estão sendo renderizadas dentro de áreas circulares (`borderRadius: 9999px`), mas as novas imagens dos 5 passos já possuem formato 1:1 e devem ser exibidas como quadrados.

### Alterações
1. No arquivo `src/components/feed/CircularSteps.tsx`, remover o arredondamento circular do container das imagens.
2. Ajustar o `boxShadow` e a borda para combinar com o novo formato quadrado, mantendo a identidade visual do app.
3. Manter a proporção 1:1, as animações de transição e o layout responsivo existente.

### Resultado esperado
As imagens aparecerão como quadrados com cantos levemente arredondados (ex: `rounded-2xl` ou `rounded-3xl`) em vez de círculos, respeitando o formato 1:1 original dos assets.
