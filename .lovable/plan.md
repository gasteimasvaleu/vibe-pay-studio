Reposicionar o parágrafo "A maior plataforma de creator economy do Brasil..." do hero para dentro do card da imagem, na parte inferior, abaixo da foto, com fonte menor.

Detalhes técnicos:
- Em `src/routes/index.tsx`, o parágrafo atualmente fica na coluna esquerda (linha 82). Ele será removido de lá e inserido dentro do card da imagem (coluna direita).
- No card da imagem, o parágrafo será posicionado na parte inferior, abaixo da imagem, usando posicionamento absoluto (`absolute bottom-0 left-0 right-0 p-6`) ou inserido após a imagem no fluxo do card.
- Reduzir o tamanho da fonte (ex: `text-sm` ou `text-xs`) para ficar proporcional ao card.
- Manter o texto centralizado e com boa legibilidade sobre o fundo do card.

Resultado esperado: o parágrafo aparece dentro do card da direita, na parte inferior, abaixo da imagem, com tamanho reduzido.