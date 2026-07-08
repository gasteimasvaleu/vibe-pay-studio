Deixar o fundo do card da direito branco puro, removendo o tom roxo/claro do gradiente (`bg-gradient-soft`) e ajustando os overlays do título e do texto inferior para não adicionarem cor roxa.

Detalhes técnicos:
- Arquivo: src/routes/index.tsx, card da imagem no hero (linhas ~91-110).
- Alterar o fundo do card de `bg-gradient-soft` para `bg-white`.
- Remover o gradiente do overlay do texto inferior (`bg-gradient-to-t from-background/70 via-background/30 to-transparent`) e substituir por fundo branco ou transparente.
- Manter o título sem fundo colorido, apenas texto preto com gradiente no span.
- Preservar o espaçamento entre título e imagem já ajustado.

Resultado esperado: card com fundo branco limpo, título e texto inferior sobre fundo branco, sem tons roxos.
