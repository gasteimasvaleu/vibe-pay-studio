## Objetivo
No desktop (`/`), o card promocional (`HeroCard`) precisa ter a mesma altura vertical do card de login ao lado, replicando o mesmo tratamento já aplicado em `/cadastro`.

## Situação atual
- `/cadastro`: passa `fullHeight` ao `HeroCard` e o grid usa `h-full` — o card promocional se estica igual ao formulário.
- `/`: `HeroCard` é usado sem `fullHeight`, então ele cai no modo `aspect-square` e fica menor que o `LoginCard`. Além disso, o grid usa `items-center`, o que impede que as colunas cresçam para a mesma altura.

## Implementação (`src/routes/index.tsx`)
1. No `<section>` hero:
   - Remover `items-center` do grid para permitir que as duas colunas ocupem a mesma altura (com `h-full`, grid alinha por padrão em `stretch`).
2. Coluna esquerda (login):
   - Envolver `<LoginCard />` em um wrapper `className="animate-fade-in h-full"` e garantir que `LoginCard` renderize com `h-full` (ou envolver com `<div className="h-full">`) para que o card ocupe toda a altura da coluna. Se `LoginCard` já tem largura/altura próprias, apenas o wrapper `h-full` basta — o `HeroCard` do outro lado se ajustará à mesma altura por conta do grid stretch.
3. Coluna direita (promocional):
   - Envolver em `<div className="hidden lg:block h-full">` (mantendo apenas no desktop, como em `/cadastro`) e passar `<HeroCard fullHeight />`.

## Validação
- Screenshot de `/` em viewport desktop confirmando que os dois cards têm exatamente a mesma altura.
- Screenshot em mobile confirmando que o `HeroCard` continua oculto (mantido apenas no desktop) ou, se preferir mantê-lo em mobile como está hoje, manter `aspect-square` no mobile via classes responsivas.
- `tsgo` passa.

## Observação
- Não altero o `HeroCard.tsx` nem `/cadastro` — a prop `fullHeight` já existe e faz exatamente o que precisamos.
- Confirmar preferência: manter o `HeroCard` visível no mobile (como hoje) ou ocultá-lo igual a `/cadastro`? Por padrão do plano vou **manter visível no mobile** (mantendo o comportamento atual da home), aplicando `fullHeight` só no desktop via wrapper responsivo. Se quiser ocultar no mobile, me avise.
