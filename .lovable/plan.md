## Objetivo
Fazer o composer do chat ocupar toda a largura disponível na área inferior da conversa em telas grandes, em vez de ficar limitado a `max-w-3xl` e centralizado.

## Mudança
Arquivo: `src/components/chat/ChatComposer.tsx` (linha 219)

- Remover `max-w-3xl mx-auto` do wrapper raiz do composer.
- Trocar por `w-full` puro, deixando o container pai (footer da conversa em `chat.$threadId.tsx`) controlar o padding lateral.

Resultado: em desktop o input + ícones se estendem por toda a largura do painel de conversa (screenshot 2), sem alterar o comportamento em mobile.

## Fora do escopo
- Nenhuma mudança em lógica, ícones, upload, gravação ou envio.
- Nenhuma alteração no layout do `chat.$threadId.tsx` — só se o padding lateral não estiver adequado após a mudança, ajustamos ali.