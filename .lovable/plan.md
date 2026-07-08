Aumentar o espaço entre o título "Monetisex, do seu jeito." e a imagem no card da direita, para igualar o espaço visual entre a imagem e o texto inferior.

Detalhes técnicos:
- Em `src/routes/index.tsx`, o título está no container absoluto superior do card da imagem (linha ~103).
- Ajustar o padding do container do título para baixá-lo levemente, aumentando o espaço entre o título e a parte visual da imagem.
- Mudar de `p-6` para algo como `pt-8 pb-4` ou `pt-10 pb-4`, mantendo o alinhamento superior (`items-start`) para que o título desça sem alterar a posição do card.
- Manter o texto inferior com seu padding atual (`p-4`) e o gradiente de fundo.
- Preservar o tamanho do título e o gradiente no span.

Resultado esperado: o título fica um pouco mais afastado da imagem, equilibrando o espaçamento com o texto da parte inferior do card.