## Objetivo
Mover a badge `Economize 5%` para a esquerda do texto do cronômetro (`Termina em Xh Ym Zs`) na seção de oferta de assinatura, economizando espaço vertical.

## Alteração proposta
No componente `ActivePromotionCard` em `src/routes/_authenticated/perfil.$username.tsx`:

1. Agrupar a badge e o countdown em uma única linha flexível (`flex items-center gap-2 justify-between` ou `flex items-center gap-2`).
2. Manter a badge como pill verde (`rounded-full bg-emerald-500/15 ...`) e o texto do countdown com estilo `text-sm text-muted-foreground`.
3. Remover o espaçamento vertical (`space-y-2`) entre badge e botão, pois a badge deixará de ocupar uma linha própria.
4. Preservar o botão "Assinar agora" e o preço original abaixo.

## Resultado esperado
A seção de oferta fica mais compacta: título, linha com badge + cronômetro, botão e preço original.