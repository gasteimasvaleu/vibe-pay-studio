# Adicionar logo colorida do Google ao botão "Continuar com Google"

## Objetivo
Inserir o logo colorido do Google (G) antes do texto no botão de login social da página `/entrar`.

## Alterações propostas

### 1. Adicionar SVG do logo do Google
No botão "Continuar com Google" em `src/routes/entrar.tsx`, adicionar um SVG inline com as cores oficiais do Google (azul, vermelho, amarelo, verde) antes do texto.

### 2. Ajustar layout do botão
- Usar `flex items-center justify-center gap-2` no botão.
- Manter o texto e o estilo atuais.
- O SVG terá tamanho aproximado de 18px × 18px.

## Escopo
- Apenas `src/routes/entrar.tsx`.
- Nenhuma alteração de backend, schema ou dados.
