## Problema

Os emojis flutuantes não aparecem porque `FloatingEmojiLayer` está renderizado **dentro** do container de mensagens (`<div ref={scrollRef} className="relative flex-1 overflow-y-auto ...">`).

Isso causa dois problemas combinados:

1. Com `absolute inset-0` dentro de um container `overflow-y-auto`, a camada é dimensionada pela **altura do conteúdo rolável** (todas as mensagens), não pela viewport visível. O `bottom-2` acaba posicionando os emojis no rodapé de todo o histórico — normalmente fora da área visível.
2. Como o layer tem `overflow-hidden`, qualquer emoji que escapa desse retângulo é cortado, e ele fica ainda atrás/entre as mensagens no fluxo do scroll.

## Correção

1. Envolver a área do chat (container de mensagens + composer, ou apenas o container de mensagens) em um wrapper `relative` e mover `<FloatingEmojiLayer />` para ser **irmão** do `scrollRef`, posicionado como `absolute inset-0 pointer-events-none` sobre o container de mensagens visível.
2. Manter `pointer-events-none` para não bloquear scroll/cliques.
3. Ajustar o `bottom-2` do `FloatingEmojiLayer` para ~72px (ou `bottom-4`) para os emojis nascerem logo acima do composer, e reduzir o `y: -420` para algo proporcional à altura da viewport (ex.: `y: -320`) para ficar consistente em telas pequenas.

Arquivos:
- `src/routes/_authenticated/chat.$threadId.tsx` — reestruturar o wrapper para tirar `FloatingEmojiLayer` de dentro do scroll.
- `src/components/chat/FloatingEmojiLayer.tsx` — pequeno ajuste de `bottom` e distância vertical da animação.

Sem mudanças de backend ou dados.