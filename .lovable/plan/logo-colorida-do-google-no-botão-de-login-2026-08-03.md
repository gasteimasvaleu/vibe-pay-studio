# Logo colorida do Google no botão de login

## O que muda

No card de login da home, o botão "Entrar com Google" hoje mostra um quadradinho branco com a letra "G". Ele será substituído pelo logo oficial colorido do Google (os quatro traços em azul, vermelho, amarelo e verde), igual ao que já foi usado na página `/entrar`.

O texto, o tamanho e o comportamento do botão continuam iguais.

## Detalhes técnicos

- Arquivo: `src/components/site/LoginCard.tsx`, linhas 267-269.
- Trocar o `<span>` com a letra "G" por um `<svg>` inline 18x18 com os quatro `path` oficiais da marca Google (mesmo markup já presente em `src/routes/entrar.tsx`), com `aria-hidden` e `shrink-0`.
- Nenhuma alteração de lógica, estado ou fluxo de autenticação.
