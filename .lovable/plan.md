## Causa

A live roda dentro do layout `_authenticated` (`src/routes/_authenticated/route.tsx`), que envolve tudo em `<div className="pb-24">` e renderiza `TopNav` + `BottomNav`, a não ser que algum componente registre o modo tela cheia (`useFullscreenOverlay`). Hoje **só o `StoryViewer` chama `openOverlay()`** — nenhuma rota de live faz isso.

Resultado no mobile:
- `live.$liveId.transmitir.tsx` usa `relative h-dvh` → altura cheia **+** os `pb-24` do layout = faixa branca de ~6rem entre o input do chat e a BottomNav.
- `live.$liveId.index.tsx` usa `fixed inset-0 z-40`, que disfarça o problema, mas ainda deixa TopNav/BottomNav montados por baixo e sujeitos a aparecer nas bordas.

## Correção

**1. Registrar a live como overlay de tela cheia (mobile)**
Em ambas as rotas (`live.$liveId.index.tsx` e `live.$liveId.transmitir.tsx`), adicionar um `useEffect` que chama `openOverlay()` na montagem e `closeOverlay()` no unmount quando `isMobile` for verdadeiro. Com isso o layout remove `pb-24`, `TopNav` e `BottomNav`, eliminando a faixa branca — a live já tem botão de voltar próprio e o chat encosta na borda inferior.

**2. Respeitar a safe area**
No container mobile da live, usar `h-dvh` com `padding-bottom: env(safe-area-inset-bottom)` no bloco do chat, para o input não ficar sob a barra de gestos do iPhone.

**3. Uniformizar o container mobile do viewer**
Trocar `fixed inset-0 z-40` por `relative h-dvh` no `live.$liveId.index.tsx`, já que com o overlay ativo não é mais preciso sobrepor a navegação — mantendo as duas telas de live com o mesmo comportamento.

No desktop nada muda: navegação e layout permanecem como estão hoje.

## Detalhes técnicos

- `openOverlay`/`closeOverlay` de `@/hooks/useFullscreenOverlay` (contador global, seguro para múltiplos consumidores).
- Efeito com dependência em `isMobile`, garantindo `closeOverlay()` ao sair da rota para não deixar a navegação escondida em outras páginas.
