Remover o escurecimento do vídeo de background na `ScrollLanding`:

- Em `src/components/landing/ScrollLanding.tsx`:
  - Remover a camada `<motion.div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />`.
  - Remover a variável `overlayOpacity`.
  - Remover a camada de vignette/purple wash (o `radial-gradient` preto sobreposto).
- O vídeo passa a ser exibido em contraste natural, sem overlay escuro nem vinheta.
- Cards glass, LoginCard, HeroCard e scroll hint permanecem inalterados.

Se ficar difícil ler o texto branco dos cards glass sobre um vídeo claro, avaliamos em seguida (podendo aumentar o `bg-white/10` para `bg-white/20` ou adicionar sombra ao texto). Nada mais é alterado.