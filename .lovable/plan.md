Substituir o vídeo de background da `ScrollLanding` por uma imagem estática.

## Alterações

**`src/components/landing/ScrollLanding.tsx`**
- Trocar a constante `VIDEO_URL` por `BACKGROUND_IMAGE_URL` apontando para a nova PNG do Supabase.
- Substituir o elemento `<video>` por uma `<div>` com `background-image` (ou `<img>` com `object-cover`), mantendo `absolute inset-0 h-full w-full object-cover`.
- Remover atributos específicos de vídeo (`autoPlay`, `muted`, `playsInline`, `preload`).
- Manter intacta toda a lógica de scroll (glass cards, LoginCard, HeroCard, hint).