Trocar o background do painel vazio de `/chat` para branco puro.

## Alteração
- `src/routes/_authenticated/chat.index.tsx` (linha 10): substituir `bg-gradient-soft` por `bg-background` para que o painel use o branco (`#FFFFFF`) do tema, alinhado ao restante do app.

Nenhum outro arquivo, componente ou lógica é alterado.