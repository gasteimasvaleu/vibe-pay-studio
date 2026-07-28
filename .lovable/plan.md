## Tornar tabela "Ganhos por produto" responsiva

Em `src/routes/_authenticated/my-monetisex-stats.tsx` (`GanhosPorProdutoTable`, linhas 903–929), o grid usa `gap-x-10` fixo — no mobile o total dessa distância estoura a largura e a coluna "Comissão" é cortada.

**Alterações (três linhas de grid — header, linhas de item e total):**
- Trocar `gap-x-10` por `gap-x-3 sm:gap-x-10` nas três ocorrências (linhas 904, 913, 923).
- No card wrapper (linha 903): reduzir padding no mobile — `p-4 sm:p-5`.
- Reduzir tamanho das fontes das colunas numéricas no mobile via `text-xs sm:text-sm` no container das linhas para caber melhor.

Sem mudar estrutura, dados ou lógica.
