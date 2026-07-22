## O que mudar

O card da mensagem exclusiva já está `bg-white`. O que aparece roxo é o **container da conversa**, que usa `bg-gradient-soft` (gradiente lavanda) em `src/routes/_authenticated/chat.$threadId.tsx` linha 265.

## Alteração

Em `src/routes/_authenticated/chat.$threadId.tsx`, linha 265:

```diff
- <div className="flex flex-col flex-1 min-h-[100svh] bg-gradient-soft">
+ <div className="flex flex-col flex-1 min-h-[100svh] bg-white">
```

Escopo: só o painel da direita (a conversa aberta). A sidebar de "Conversas", header superior e restante do app ficam inalterados.
