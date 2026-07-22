## Ajuste da sidebar do chat

Em `src/routes/_authenticated/chat.tsx`:

1. Aside (linha 146-152): trocar `bg-card/80 backdrop-blur-xl` por `bg-white` para o corpo inteiro ficar branco.
2. Header "Conversas" (linha 153): adicionar `bg-card/80 backdrop-blur-xl` para preservar a cor atual do topo.
3. Wrapper do input de busca (linha 193): trocar `px-4` por `px-4 pt-4`, criando o respiro entre a linha inferior do header e o campo de busca.
