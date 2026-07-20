Ajustes na `ScrollLanding` desktop:

### 1. Legibilidade dos cards glass (fonte branca + brilho roxo)
- Em `src/components/landing/GlassPromoCard.tsx`, aplicar `text-shadow` roxo forte em título, corpo e rodapé:
  - Título: `textShadow: "0 2px 12px rgba(120,40,200,0.9), 0 0 24px rgba(80,20,160,0.7)"`
  - Corpo/eyebrow/footer: `textShadow: "0 1px 8px rgba(80,20,160,0.85)"`
- Reforçar levemente o `bg-white/10 → bg-white/15` para dar mais base sob o texto sem escurecer o card.

### 2. Igualar alturas dos 3 cards glass (card 3 estava menor)
- No grid dos glass em `ScrollLanding.tsx`, adicionar `items-stretch` e no `GlassPromoCard` usar `h-full flex flex-col` com o rodapé em `mt-auto`, garantindo mesma altura vertical independente do tamanho do texto.

### 3. LoginCard e HeroCard aparecendo ao mesmo tempo
- Em `ScrollLanding.tsx`, alinhar as ranges de scroll:
  - `loginOpacity` e `heroOpacity`: ambos `[0.45, 0.7]` de `0 → 1`
  - `loginX`: `[0.45, 0.7]` `-80 → 0`
  - `heroX`: `[0.45, 0.7]` `80 → 0`
- Remover a defasagem atual (login em 0.4-0.6, hero em 0.65-0.85).

### 4. Igualar altura do LoginCard ao HeroCard
- No layout foreground em `ScrollLanding.tsx`, aplicar `items-stretch` no grid e passar `h-full` no wrapper do `LoginCard`.
- No `LoginCard`, garantir que o card interno estique: adicionar `h-full flex flex-col` no wrapper `motion.div` e no card interno (`rounded-3xl ... p-8`), e transformar o `form` em `flex-1 flex flex-col` para preencher o espaço vertical disponível (mantendo o botão "Cadastre-se" na base natural).

### Fora do escopo
- Sem alterações de conteúdo, sem mexer no vídeo/scroll global, sem mexer no mobile.