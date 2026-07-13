## Problema
Na página `/criar-perfil-gratuito`, o botão fixo "Avançar" (step 1) e "Criar Conta" (step 2) ficam posicionados atrás da `BottomNav` do layout autenticado, dificultando o toque.

## Solução
Ajustar o posicionamento do footer fixo e o padding inferior do conteúdo para que o botão flutue acima da navbar inferior.

### Arquivo
`src/routes/_authenticated/criar-perfil-gratuito.tsx`

### Mudanças
1. **Footer fixo**: alterar `bottom-0` para `bottom-20` (ou `bottom-24`) para que o footer fique acima da `BottomNav` (altura aproximada `pb-24`).
2. **Padding do `<main>`**: aumentar `pb-32` para `pb-44` (ou `pb-48`) para garantir que o conteúdo role livremente por cima do footer e da navbar inferior, sem ficar escondido.

### Resultado esperado
O botão "Avançar" ficará visível e tocável, posicionado logo acima da navbar inferior, em ambos os steps.