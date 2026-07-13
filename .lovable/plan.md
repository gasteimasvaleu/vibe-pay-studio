## O que será feito

Substituir a imagem do logo no `TopNav` pela nova URL fornecida e aumentar o tamanho visual do logo, mantendo a altura total da navbar inalterada.

## Mudanças

1. **Atualizar URL do logo** em `src/components/site/TopNav.tsx`:
   - Trocar `monetisexy2..png` por `https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/monetisexy3..png`

2. **Aumentar o logo e preservar a altura da navbar**:
   - Aumentar a altura do logo de `h-7` (28px) para `h-9` (36px), igualando-o ao avatar do lado direito.
   - Reduzir o padding vertical de `py-3` (12px em cada lado) para `py-2` (8px em cada lado), mantendo a altura total da navbar em ~52px.

## Resultado esperado

A navbar continua com a mesma altura externa, mas o logo fica visivelmente maior e alinhado com o avatar circular do dashboard.