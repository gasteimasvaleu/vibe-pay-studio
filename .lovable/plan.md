## Contexto
O logo "monetisexy." está centralizado no header do site (`justify-center`). O usuário selecionou esse elemento no preview e pediu para alinhá-lo à esquerda, inclusive na página `/cadastro`.

## Diagnóstico
- `src/components/site/Navbar.tsx` renderiza o logo dentro de um container com `flex items-center justify-center` (linha 29).
- A página `/cadastro` usa `SiteLayout` com `minimalNav`, que por sua vez renderiza o mesmo `<Navbar />`. Logo, a correção na Navbar se propaga para `/cadastro`.
- Não há outro texto "monetisexy." na página `/cadastro` — o HeroCard usa "Monetisexy," (título), não o logo.

## Plano de implementação
1. Em `src/components/site/Navbar.tsx`, alterar a classe do container interno do header de `justify-center` para `justify-start`, mantendo `items-center` e as demais classes intactas.
2. Verificar visualmente no preview se o logo ficou alinhado à esquerda tanto na home quanto na página `/cadastro`.

## Arquivos alterados
- `src/components/site/Navbar.tsx`