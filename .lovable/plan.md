## Diagnóstico

Ao abrir um story, a tela toda mostra "This page didn't load" — é o `errorComponent` raiz reagindo a um throw dentro do `StoryViewer`.

Em `src/components/feed/StoryViewer.tsx`, a área de conteúdo trata corretamente o caso `!current` (mostra "Nenhum story disponível."), mas logo abaixo, ainda dentro do mesmo container, as **tap zones** são renderizadas com:

```tsx
{current.unlocked && ( … )}
```

sem checar se `current` existe. Quando `stories` chega vazio (story expirou, foi apagado, ou a query terminou antes do estado local resetar), `current` é `undefined` e `current.unlocked` lança `TypeError`, derrubando a rota `/feed` inteira para o error boundary — exatamente o que o screenshot mostra.

## Correção

Arquivo único: `src/components/feed/StoryViewer.tsx`

1. Trocar a guarda das tap zones para `{current && current.unlocked && ( … )}`.
2. Sanity check nos outros usos de `current.*` fora do ternário (por ex. o bloco de caption já tem `current &&`, mantém como está).

Sem mudanças em backend, tipos ou UX visual — apenas evita o crash quando não há story atual.

## Verificação

- Typecheck.
- Abrir um story existente: reproduz fluxo normal.
- Simular lista vazia: agora mostra "Nenhum story disponível." em vez de tela branca.
