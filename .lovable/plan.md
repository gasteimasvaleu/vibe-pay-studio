# Ajuste fino no label "Postar" da BottomNav

## Objetivo
Descer levemente o texto "Postar" abaixo do botão central de postar, pois ele está colado no anel do botão.

## Mudança
- Arquivo: `src/components/site/BottomNav.tsx`
- Linha 133: alterar a classe do `<span>` do label de `text-[11px] font-medium leading-none -mt-1` para `text-[11px] font-medium leading-none mt-0.5`.

## Resultado esperado
Pequeno afastamento (~2 px) do texto em relação ao anel do botão, mantendo a estética atual.