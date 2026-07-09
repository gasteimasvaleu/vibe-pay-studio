## Objetivo
Corrigir problemas visuais no `/feed` e remover dados fictícios.

## Mudanças em `src/routes/_authenticated/feed.tsx`

### 1. Contraste / visibilidade
Na screenshot, textos como `@handle · há X min`, placeholder do composer, tags do "Em alta" e nome do creator ficam quase invisíveis sobre o fundo claro do preview. Ajustar:
- Reforçar o background da página (garantir que `bg-background` escuro cubra toda a viewport, não só o hero) — envolver o conteúdo em wrapper com `bg-[#0b0518]` sólido antes das camadas de gradiente, para não depender do tema do host.
- Aumentar opacidade dos textos secundários: `text-white/50` → `text-white/70`, `text-white/40` → `text-white/60`.
- Placeholder do composer: `text-white/50` → `text-white/80` e fundo `bg-white/10`.
- Nome do creator no card: já é `font-semibold` mas está sumindo — subir para `text-white` explícito e handle para `text-white/70`.
- Sidebar itens inativos: `text-white/60` → `text-white/75`.

### 2. Só dados reais
Remover todo mock e placeholder de conteúdo:
- Excluir `MOCK_POSTS` e o `PostCard` renderizado a partir dele.
- Excluir a lista fake `["#packvip","#livehoje",...]` do card "Em alta".
- Excluir o composer placeholder ("Compartilhe uma novidade...") — não há backend de posts ainda.
- Substituir por estados vazios honestos:
  - Feed principal: card "Seu feed ainda está vazio. Assim que você seguir creators, os posts aparecem aqui." com CTA `Link` para `/explorar` (ou desabilitado se rota não existir — usar `/dashboard`).
  - Right rail "Em alta": ocultar o bloco enquanto não houver fonte real de trending tags.
- Manter apenas o header, sidebar de navegação e o card de boas-vindas (que usa `username` real do contexto).

### 3. Largura dos cards em desktop
Grid atual: `lg:grid-cols-[220px_minmax(0,1fr)_280px]` dentro de `max-w-6xl`. Ampliar:
- Container: `max-w-6xl` → `max-w-7xl`.
- Grid: manter 3 colunas mas dar mais espaço à coluna central — `lg:grid-cols-[220px_minmax(0,1fr)_300px]` com `max-w-7xl` já entrega ~40% a mais de largura no feed.
- Estado vazio e card de boas-vindas usam `w-full` (sem `max-w` interno), então crescem junto.

## Fora de escopo
- Não mexer no fluxo de onboarding/Veriff.
- Não criar backend de posts nem rota `/explorar`.
