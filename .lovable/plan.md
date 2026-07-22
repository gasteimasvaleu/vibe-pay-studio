## Diagnóstico confirmado

O layout do `/_authenticated` envolve todas as rotas em `<div className="pb-24">` (6rem) e a `BottomNav` é `fixed` com altura de apenas `h-16` (4rem + safe-area). A página `/chat` usa `h-[calc(100svh-10rem)]`, então:

- TopNav sticky ≈ 3.3rem
- Chat consome `100svh - 10rem`
- Sobra ≈ 6rem de `pb-24` abaixo do chat
- BottomNav fixa cobre só 4rem dessa faixa

Resultado: ~2rem visíveis do background do wrapper aparecem como faixa clara entre o chat e a BottomNav (visível no screenshot).

## Correção

Ajustar apenas `src/routes/_authenticated/chat.tsx`:

1. Trocar `h-[calc(100svh-10rem)]` por `h-[calc(100svh-3.5rem)] -mb-24` para que o container do chat "coma" o `pb-24` do layout pai e vá até a borda inferior real da viewport.
2. Adicionar `pb-16` (+ `pb-[env(safe-area-inset-bottom)]` no wrapper interno da coluna de mensagens) para que o composer e a lista não fiquem ocultos atrás da BottomNav fixa.

Sem alterações em `route.tsx` nem na BottomNav — mantém o comportamento das demais páginas.
