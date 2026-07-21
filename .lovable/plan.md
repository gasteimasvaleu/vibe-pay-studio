Ajustar o botão "Acessar carteira" na seção "Minha carteira" da página `/banco`.

1. Tornar o botão um link para `/mywallet` usando o componente `Link` do TanStack Router (já importado na rota).
2. Alterar o `variant` do botão de `"outline"` para `"default"`, aplicando a cor primária padrão do app (lilás) e o texto na cor de contraste padrão (`primary-foreground`).
3. Manter as classes existentes de espaçamento (`mt-4 rounded-md`) e a altura padrão fina (`h-9`) já configurada no componente `Button`.

Arquivo a ser alterado: `src/routes/_authenticated/banco.tsx` (linha 813).