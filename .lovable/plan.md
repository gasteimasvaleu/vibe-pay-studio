## Problema

No `MediaLightbox`, o ícone de lupa (`Search`) no header está sem ação — era um placeholder visual. O usuário espera que ele funcione como um botão de **zoom** na mídia.

## Correção

**`src/components/feed/MediaLightbox.tsx`**

1. Adicionar estado local `zoom` (número, começando em `1`). Passos: `1x → 1.5x → 2x → 3x` e volta para `1x` ao passar de `3x` (clique cíclico). Reset para `1` sempre que `item` mudar (nova mídia aberta).
2. O botão da lupa passa a chamar `setZoom(next)`. Título do botão vira "Aumentar zoom (Nx)".
3. Aplicar zoom apenas para imagens: envolver a `<img>` em um wrapper `overflow-auto` (permite pan quando ampliada) e aplicar `style={{ transform: 'scale(zoom)', transformOrigin: 'center center', transition: 'transform 200ms ease' }}` na imagem.
4. Para vídeos, o botão fica desabilitado (`opacity-50 cursor-not-allowed`) — zoom não faz sentido em `<video controls>`.
5. Indicador sutil ao lado da lupa quando `zoom > 1`: badge com o valor atual (ex.: "2x") em texto pequeno.

Também aproveitar para silenciar o warning do Radix adicionando `<DialogDescription>` visualmente escondido ("Mídia em tela cheia com opções de zoom e ação para abrir o post relacionado.").

## Fora de escopo

- Pinch-to-zoom em mobile / arrastar para pan avançado (o `overflow-auto` já dá pan por scroll).
- Zoom em vídeos.
