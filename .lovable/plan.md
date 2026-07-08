Remover o conteúdo atual da coluna esquerda do hero (label, botões e avatar stack) e substituir por um card transparente/glassmorphism para login.

Detalhes técnicos:
- Em `src/routes/index.tsx`, a coluna esquerda do hero será esvaziada e receberá um card de login com visual translúcido.
- O card usará fundo transparente/escuro com blur e borda sutil (`bg-background/40 backdrop-blur-xl border border-border/50` ou similar), alinhado ao tema atual.
- O card conterá: título "Entrar", campos de e-mail e senha, botão de login e link para cadastro.
- Mantém a responsividade: em mobile o card ocupa a largura, em desktop fica na coluna esquerda alinhado ao card de imagem da direita.
- Remove os botões "Criar minha conta grátis" e "Como funciona" e o stack de avatares dessa seção.

Resultado esperado: o hero passa a ter apenas o card de login à esquerda e o card da imagem à direita, com visual limpo e transparente.