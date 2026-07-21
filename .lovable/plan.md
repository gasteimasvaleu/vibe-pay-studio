Adaptar `src/components/feed/CircularSteps.tsx` para o modelo de UX do componente `CircularTestimonials` de referência, mantendo os 5 passos, cores roxas do app e imagens já configuradas em `/feed`.

## Mudanças em `src/components/feed/CircularSteps.tsx`

1. **Imagens de fundo mais inclinadas**
   - Aumentar `rotateY` das imagens laterais de `20deg` / `-20deg` para `15deg` / `-15deg` mas combinar com maior deslocamento vertical (`translateY -maxStickUp`) e opacidade total (`1`) — seguindo o modelo referência (efeito de cartas empilhadas mais inclinadas atrás).
   - Ajustar `maxStickUp = gap * 0.8` (referência) para inclinação mais pronunciada.
   - Reduzir `scale` lateral de `0.7` para `0.85` (referência) para que as imagens de trás fiquem visíveis nas laterais, aparecendo mais como no screenshot.
   - Manter `borderRadius`, `border` e `boxShadow` atuais (padrão do app).

2. **Tamanho maior das imagens**
   - Aumentar `max-w-sm` do container para `max-w-md` (ou `max-w-lg` no desktop).
   - Aumentar `width` interno de `72%` para `82%`.

3. **Preservar**
   - Os 5 passos e seus textos.
   - Cores roxas (`--primary`, gradiente `#d946ef → #9333ea`).
   - As 5 imagens do Supabase já mapeadas em `src/routes/_authenticated/feed.tsx`.
   - Setas, dots de paginação, animação de palavras com framer-motion.

Nenhuma outra alteração fora deste arquivo.
