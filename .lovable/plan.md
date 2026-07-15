## Mudança

No `LockedOverlay` em `src/components/feed/PublicationCard.tsx` (variante `challenge`):

1. Remover o container translúcido inferior que mostra a barra de progresso, o texto `R$ x / R$ y` e `N contribuições` — essa informação já aparece no painel de tiers logo abaixo do card.
2. Manter apenas o ícone do troféu no canto superior direito e o botão "Aceitar desafio" centralizado vertical e horizontalmente sobre a imagem de prévia (via `absolute inset-0 flex items-center justify-center`).
3. Fazer o mesmo tratamento na variante `paid`: botão "Desbloquear" centralizado no meio da imagem, sem faixa inferior.

Sem alteração de lógica de dados nem de cores (mantém `bg-primary`).
