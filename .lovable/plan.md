## Objetivo

Trocar o bloco de mídia único do `PublicationCard` por um carrossel estilo Instagram/Privacy, mostrando as imagens sem distorção e igual ao screenshot.

## Mudanças em `src/components/feed/PublicationCard.tsx`

1. **Estado do carrossel:** `const [index, setIndex] = useState(0)` — sempre presente, ativo quando `item.media.length > 1`.

2. **Container da mídia:**
   - Substituir `aspect-[4/5]` fixo por um wrapper com `bg-black` (fundo escuro para as barras laterais quando a imagem tem outra proporção — como aparece no screenshot com efeito blur nas laterais).
   - Altura: manter `aspect-[4/5]` mas trocar `object-cover` por `object-contain` para NÃO esticar.
   - Adicionar camada de fundo blur com a mesma imagem (`img` absoluto `object-cover blur-2xl scale-110 opacity-60`) atrás da imagem principal, para preencher as laterais como no screenshot.

3. **Controles de carrossel (só quando `media.length > 1` e não bloqueado):**
   - Botão `‹` à esquerda e `›` à direita, verticalmente centralizados, círculos semi-transparentes `bg-black/30 hover:bg-black/50 text-white`, escondidos nos extremos (`index === 0` esconde o esquerdo, `index === last` esconde o direito).
   - Badge "N/Total" no canto inferior/central com ícone `Images` (lucide) — `absolute bottom-3 left-1/2 -translate-x-1/2`, `bg-black/60 text-white text-xs px-2 py-1 rounded-full`, seguindo o screenshot.
   - Indicador de "pilha de cards" no canto superior direito (ícone `Layers` ou `Copy` da lucide) — `absolute top-3 right-3 text-white/90`.
   - Suporte a swipe horizontal em touch (via `onTouchStart`/`onTouchEnd` calculando delta).

4. **Vídeo:** manter renderização como `<video controls>` com `object-contain` e mesmo fundo blur.

5. **Áudio + carrossel:** o player de áudio continua acima da mídia (já implementado), sem mudanças.

6. **Bloqueado:** quando `locked`, manter o `LockedOverlay` num único container `aspect-[4/5]` sem carrossel.

## Fora do escopo

- Zoom/pinch nas imagens.
- Autoplay do vídeo.
- Paginação por dots (usar apenas o badge "N/Total" como no screenshot).