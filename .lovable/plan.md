Ajustar o título "Monetisex, do seu jeito." no hero para ficar em overlay dentro do card da imagem, posicionado um pouco acima do centro, e remover a separação com fundo gradiente que apareceu na última alteração.

Detalhes técnicos:
- Em `src/routes/index.tsx`, o card do hero será reestruturado: a imagem volta a preencher o card com `aspect-square` e `overflow-hidden`, e o `<h1>` fica absolutamente posicionado sobre a imagem.
- O título será posicionado no topo/centro do card (ex: `absolute top-0 left-0 right-0 flex items-start justify-center p-6`) para ficar um pouco acima do centro visual da imagem.
- Mantém o tamanho menor (`text-2xl md:text-3xl`) e o gradiente no span "do seu jeito.".
- Remove o container flex que criou a faixa roxa/gradiente acima da imagem, fazendo o título flutuar diretamente sobre a imagem.

Resultado esperado: o título aparece dentro do mesmo card, sobrepondo a imagem na parte superior, sem fundo de cor sólido/gradiente por trás dele.