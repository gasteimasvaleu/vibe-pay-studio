## Objetivo
Impedir que as telas de live forcem o tema escuro, respeitando o tema atual do app (claro por padrão) — inclusive nos dialogs abertos a partir delas.

## Causa
Ambas as rotas de live chamam `useDarkSurface()`, que adiciona `.dark` no `<html>` enquanto a página está montada. Isso escurece toda a UI, incluindo Dialogs/Popovers (que são portais renderizados no mesmo `<html>`).

## Alterações
1. `src/routes/_authenticated/live.$liveId.index.tsx` — remover `useDarkSurface()` e o import.
2. `src/routes/_authenticated/live.$liveId.transmitir.tsx` — remover `useDarkSurface()` e o import.
3. Manter o visual escuro apenas onde é intrínseco ao player (o próprio `<video>`/overlays já têm fundo preto por classes locais), sem alterar tokens globais.

## Observações
- Não altero o hook `useDarkSurface` (ainda pode ser usado por outras superfícies).
- Não mexo em componentes de dialog: eles voltam a herdar o tema global (claro) automaticamente.
- Nada de lógica de negócio muda.