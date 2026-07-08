Ajustar o espaçamento entre o título "Monetisex, do seu jeito." e a imagem do card da direita, aumentando ainda mais o padding superior do container absoluto para equilibrar com o espaçamento inferior (texto com p-4).

Detalhes técnicos:
- Arquivo: src/routes/index.tsx, linha ~100.
- Alterar o container do título de `pt-8 pb-4` para `pt-12 pb-4` (ou equivalente que balanceie visualmente com o texto inferior).
- Manter `items-start`, `justify-center`, `text-center`, tamanho de fonte e gradiente do span.
- Preservar o texto inferior com `p-4` e o gradiente de fundo.

Resultado esperado: maior respiro entre o topo do card/título e a imagem, deixando o espaçamento superior visualmente equivalente ao espaçamento inferior.
