## Remover card de boas-vindas do feed

O card "Feed / Olá, @username 👋" no topo de `/feed` (linhas 162–175 de `src/routes/_authenticated/feed.tsx`) será removido, já que o `StoriesCarousel` agora ocupa o topo da página.

### Alterações

- `src/routes/_authenticated/feed.tsx`: remover o `<motion.section>` de boas-vindas, deixando o `StoriesCarousel` como primeiro elemento do `<main>`.
- Sem mudanças em dados, componentes ou lógica. `CircularSteps` (empty state) permanece intacto.
