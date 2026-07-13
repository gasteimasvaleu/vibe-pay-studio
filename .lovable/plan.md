## Problema

Na tela **"Criando publicação"** (Step 2) só aparece a primeira imagem porque o código renderiza apenas `media[0]` fora do modo reordenar (`publisher.tsx` linha 809/843-851).

## Correção

Substituir o preview único por uma **tira horizontal de miniaturas** com todas as mídias enviadas (mantendo a proporção 3/4 já usada), assim as 2+ imagens do Step 1 aparecem no Step 2.

- Se houver 1 mídia: mostrar o preview grande atual (comportamento inalterado).
- Se houver 2+: renderizar um scroll horizontal (`flex gap-2 overflow-x-auto`) com cada item em `w-32 aspect-[3/4] rounded-2xl`, primeira imagem em destaque.
- Vídeos continuam usando `<video>`, imagens usam `<img>` com `object-cover`.
- Modo reordenar (grid 3 colunas com DnD) permanece igual.

Arquivo alterado: `src/routes/_authenticated/publisher.tsx` (bloco do `StepCompose`, linhas ~843-852).

Nenhuma mudança em upload, estado ou backend.