## Problema
Na página `/chat/$threadId`, o `ChatComposer` está envolto por `<div className="max-w-3xl mx-auto">` (linha 817 de `src/routes/_authenticated/chat.$threadId.tsx`), o que limita a largura em ~48rem e centraliza o composer, deixando grandes espaços vazios em telas maiores.

## Mudança
- Em `src/routes/_authenticated/chat.$threadId.tsx`, remover o wrapper `max-w-3xl mx-auto` ao redor de `<ChatComposer>`, deixando o composer usar `w-full` (mesmo padrão já aplicado em `/chat-agendamento`).

Sem alterações de lógica/backend — apenas ajuste de layout.