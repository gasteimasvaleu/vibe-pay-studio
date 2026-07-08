Afastar o título "Monetisex, do seu jeito." da imagem no card da direita, corrigindo o espaçamento para que o título fique visualmente mais separado do elemento visual abaixo.

Detalhes técnicos:
- Arquivo: src/routes/index.tsx, card da imagem no hero (linhas ~91-110).
- O título atualmente está dentro de um container absoluto (`absolute top-0`) com `pt-12`, o que na prática o empurra para baixo, sobre a imagem.
- Reorganizar o card para um layout flex vertical (`flex flex-col`) com:
  - Título no topo (sem posicionamento absoluto).
  - Imagem com altura controlada (`h-[70%]` ou similar) para não ocupar todo o card, criando espaço visível entre título e imagem.
  - Ajustar padding/gap para balancear com o texto inferior.
- Manter estilo, gradiente e tamanho do título.
- Preservar o texto inferior com seu gradiente de fundo.

Resultado esperado: título mais separado da imagem, com espaçamento superior visivelmente maior, equilibrando o card.
