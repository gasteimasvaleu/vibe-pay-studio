## Objetivo
Corrigir o layout da página `/promotion` para que a barra de progresso fique fora da navbar (acima do título de cada step) e reduzir o espaço vazio entre o input "Nome da campanha" e o botão "Avançar".

## Alterações propostas

### 1. `src/components/promotion/PromotionShell.tsx`
- Remover a barra de progresso do `<header>` (linhas 36-43).
- Manter o header apenas com botão Voltar + título "Criando oferta".
- Criar/exportar um novo componente `PromotionProgress` que recebe `step` e `totalSteps` e renderiza a barra com largura máxima `max-w-2xl` e estilos atuais (`bg-muted`, preenchimento `bg-gradient-primary`).
- Ajustar o `<main>` para ter menos `padding-top` (`py-6` ou `py-5` em vez de `py-8`) e o footer para ter menos `padding` (`py-3` em vez de `py-4`).
- Manter o footer sticky (mobile-friendly), mas com altura menor para diminuir a distância visual entre o input e o botão.

### 2. `src/routes/_authenticated/promotion.tsx`
- Em cada step, renderizar `<PromotionProgress step={stepIndex + 1} totalSteps={totalSteps} />` logo no início do children do `PromotionShell`, **antes** do `<PromotionHeader>`.
- No step `name`, reduzir a margem inferior do `PromotionHeader` (`mb-6` em vez de `mb-8`) para aproximar o input do título.
- Manter o botão "Avançar" no footer, mas aproveitar o padding menor do footer para que ele suba visualmente.

### 3. Verificação visual
- Navegar até `/promotion` no preview.
- Confirmar que a barra de progresso aparece abaixo do header fixo, acima do título "Dê um nome à sua oferta".
- Confirmar que o espaço entre o input "Nome da campanha" e o botão "Avançar" ficou menor e equilibrado.