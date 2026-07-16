## Objetivo
Diminuir o espaço entre o conteúdo do carrossel de passos (`CircularSteps`) e a borda do card pai na tela de feed vazio.

## Alterações propostas

1. **Reduzir o padding do card pai** em `src/routes/_authenticated/feed.tsx`:
   - Local: `<motion.section>` que envolve o `<CircularSteps>` (linha ~199).
   - Atual: `p-6 md:p-10`
   - Novo: `p-4 md:p-6`

2. **Reduzir o gap interno do carrossel** em `src/components/feed/CircularSteps.tsx`:
   - Local: grid principal do componente (linha ~159).
   - Atual: `gap-8`
   - Novo: `gap-4 md:gap-6`

## Resultado esperado
O card fica mais compacto, com menos espaço em branco entre a borda e o conteúdo do carrossel, deixando a interface mais limpa sem quebrar o layout responsivo.

## Arquivos que serão alterados
- `src/routes/_authenticated/feed.tsx`
- `src/components/feed/CircularSteps.tsx`