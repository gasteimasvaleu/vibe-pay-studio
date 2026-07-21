## Objetivo
Substituir os placeholders `/placeholder.svg` pelas 5 imagens reais fornecidas nos 5 passos do componente `CircularSteps` na página `/feed`.

## Estado atual
- O array `steps` em `src/routes/_authenticated/feed.tsx` já contém os 5 textos corretos ("Você chegou!", "Em Alta", "Conheça o Mural", "Se interessou?", "Assinou?"), mas todos usam `src: "/placeholder.svg"`.
- O componente `CircularSteps` em `src/components/feed/CircularSteps.tsx` renderiza essas imagens via `step.src`.

## Mapeamento das imagens
1. **Passo 1 — Você chegou!** → `openart-image_1784622024885_9b463187_1784622025991_241a55cc.png`
2. **Passo 2 — Em Alta** → `openart-image_1784622105669_f17e2279_1784622106666_13d91818.png`
3. **Passo 3 — Conheça o Mural** → `openart-image_1784622441232_336327f6_1784622442736_9e654942.png`
4. **Passo 4 — Se interessou?** → `openart-image_1784622583046_6307d7aa_1784622584052_e08a8ea3.png`
5. **Passo 5 — Assinou?** → `openart-image_1784622801840_727ff900_1784622802895_bfe312fe.png`

## Implementação
1. Em `src/routes/_authenticated/feed.tsx`, atualizar o campo `src` de cada um dos 5 objetos do array `steps` para a URL correspondente do Supabase Storage.
2. Não alterar `CircularSteps.tsx`, lógica, textos, cores ou animações.

## Verificação
- Abrir `/feed` em uma conta sem publicações para visualizar o `CircularSteps`.
- Confirmar que cada um dos 5 passos exibe a imagem correta e que não há imagens quebradas (erro 404 no network).