# HeroCard acima do LoginCard no mobile da landing page

## Objetivo
Na landing page (`/`), fazer com que o `HeroCard` apareça acima do `LoginCard` na versão mobile, mantendo a disposição lateral (LoginCard à esquerda, HeroCard à direita) no desktop.

## Estado atual
O `ScrollLanding.tsx` usa `grid grid-cols-2` fixo, o que mantém os cards lado a lado em todas as larguras. Em mobile, o `LoginCard` fica à esquerda e o `HeroCard` à direita.

## Alterações propostas

### 1. Tornar o grid responsivo
Alterar `grid grid-cols-2` para `grid grid-cols-1 md:grid-cols-2` no container dos cards.

### 2. Reordenar os cards no mobile
- `HeroCard`: adicionar `order-1 md:order-2` para aparecer primeiro no mobile e segundo no desktop.
- `LoginCard`: adicionar `order-2 md:order-1` para aparecer depois no mobile e primeiro no desktop.

### 3. Ajustar gaps responsivos
Reduzir o gap vertical no mobile (`gap-6 md:gap-12`) para não ficar muito espaçado quando empilhados.

### 4. Preservar animações de scroll
Manter as animações `loginOpacity/x` e `heroOpacity/x` nos respectivos wrappers, já que a ordem visual muda apenas via CSS.

## Escopo
- Apenas `src/components/landing/ScrollLanding.tsx`.
- Nenhuma alteração de backend, schema ou dados.
