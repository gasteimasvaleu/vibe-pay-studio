Trocar o background da landing page desktop (`/`) de volta para vídeo, usando a URL MP4 corrigida fornecida pelo usuário.

## Alterações

1. **Atualizar `src/components/landing/ScrollLanding.tsx`**
   - Substituir a constante `BACKGROUND_IMAGE_URL` pela nova URL MP4:
     `https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/openart-02178458091058100000000000000000000ffffc0a8b246874113_1784581253477_ada8c43a.mp4`
   - Trocar o elemento `<img>` por `<video>` com:
     - `autoPlay`
     - `muted` (necessário para autoplay em navegadores)
     - `playsInline` (necessário para iOS)
     - **sem** `loop` (conforme solicitação anterior: o vídeo deve rodar uma única vez)
     - `className="absolute inset-0 h-full w-full object-cover"`
     - `aria-hidden="true"`
     - `alt` não se aplica a `<video>`; manter apenas `aria-hidden`

## O que não muda

- Todas as animações de scroll (glass cards, LoginCard, HeroCard) permanecem iguais.
- O efeito glass dos cards CTA permanece.
- O vídeo continua sem escurecimento/overlay.

## Resultado esperado

A landing page desktop exibe o vídeo MP4 correto como background, reproduzindo automaticamente uma única vez, enquanto os elementos glass e os cards de login/promoção sobem por cima conforme o scroll.