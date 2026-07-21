## Objetivo
Adicionar um espaçamento visível entre a linha divisória do header (`border-b`) e o grid de imagens hero na primeira etapa da página `/criar-perfil-gratuito`, conforme solicitado.

## Estado atual
- O header está padronizado com `sticky top-0 z-20 ... border-b border-border bg-background/90 backdrop-blur`.
- O `<main>` da página usa `max-w-2xl mx-auto px-4 pb-44`, sem padding superior.
- A `<section>` do `step === 1` contém o grid de imagens como primeiro filho, sem `padding-top` ou `margin-top`, fazendo com que as imagens fiquem coladas na linha do header.

## Alteração proposta
1. Em `src/routes/_authenticated/criar-perfil-gratuito.tsx`, adicionar `pt-6` (ou `pt-8`, ajustável) na `<section>` do `step === 1` para criar o respiro entre o header e o grid de imagens.
2. Opcionalmente, adicionar `pt-6` também na `<section>` do `step === 2` para manter o alinhamento vertical consistente entre as duas etapas.
3. Verificar o preview para confirmar que o espaçamento ficou equilibrado e que não houve quebra do layout responsivo.

## Escopo
- Apenas ajuste de espaçamento/UX na página `/criar-perfil-gratuito`.
- Nenhuma alteração de funcionalidade, schema, API ou navegação.

## Validação
- Typecheck/build deve passar.
- Visualmente, deve haver um espaço claro entre a linha inferior do header e o topo das imagens.