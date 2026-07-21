## Objetivo

Alinhar o visual da rota `/follow` com o padrão das outras páginas (feed, dashboard, `/banco`, `/my-monetisexy-stats`), que usam fundo transparente sobre o `bg-background` global e header translúcido com blur.

## Diagnóstico

Em `src/routes/_authenticated/follow.tsx` o shell força:
- `<div className="absolute inset-0 bg-card" />` cobrindo toda a viewport com a cor de card.
- `<header className="... bg-card">` sólido.

Isso deixa a página com um tom diferente do restante do app (que fica sobre `bg-background`).

## Funcionalidade

A página já é funcional: usa `listMySubscribers` (server function protegida) via loader + `useSuspenseQuery`, com busca client-side por `username`/`displayName`, estado vazio, estado sem resultado e navegação para `/perfil/$username`. Não precisa de nova implementação — apenas o ajuste visual.

## Mudanças

Arquivo: `src/routes/_authenticated/follow.tsx` (função `FollowShell`)

1. Remover o overlay `<div className="absolute inset-0 bg-card" />`.
2. Trocar o wrapper `min-h-screen ... overflow-hidden` por `min-h-screen text-foreground` (sem overlay, herda `bg-background`).
3. Header: `bg-card` → `bg-background/90 backdrop-blur` + manter `border-b border-border` (mesmo padrão do `/banco` e `/my-monetisexy-stats`).

Nenhuma outra alteração de lógica, dados ou componentes.
