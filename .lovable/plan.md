## Objetivo

Exibir no card de publicação de desafio um painel abaixo da imagem contendo:
- Cabeçalho com valor arrecadado à esquerda e valor da meta à direita (ícones: saco de dinheiro + info).
- Barra de progresso.
- Grade com os botões de faixas (lances) definidos no sheet de criação do desafio.

Clicar em uma faixa abre o `ChallengeContributeSheet` já com o valor pré-selecionado.

## Alterações

### 1. Backend — expor faixas no feed
`src/lib/publications.functions.ts`
- Adicionar `challenge_tiers_cents: number[] | null` em `FeedItem`.
- Em `getFeed`, `getUserPublications` e `getUserPublicPublications`, quando houver `challengeIds`, buscar `publication_challenge_tiers` (`publication_id, amount_cents, position`) e montar um `Map<string, number[]>` ordenado por `position`. Anexar a cada item de desafio; `null` nas demais.

### 2. UI — novo painel abaixo da mídia
`src/components/feed/PublicationCard.tsx`
- Novo componente `ChallengeTiersPanel({ item, onSelectTier })` renderizado logo depois da área de mídia, apenas quando `item.visibility === "challenge"`.
- Estrutura visual (baseada no screenshot enviado):
  - Bloco superior branco com cantos arredondados: à esquerda ícone saco de dinheiro + `brl(raised)`; à direita `brl(goal)` + ícone info.
  - Barra de progresso fina (usa o mesmo gradiente laranja/rosa já usado no `LockedOverlay`).
  - Grade `grid-cols-2 gap-2` com um botão pill por faixa (`brl(amount)`), borda sutil, hover leve.
- Botão de faixa chama `onSelectTier(item, amountCents)`.
- Nada da lógica do `LockedOverlay` muda; ele continua sobre a mídia quando a publicação está bloqueada.

### 3. Integração no feed
`src/routes/_authenticated/feed.tsx`
- Passar novo prop `onChallengeTierSelect={(item, tierCents) => ...}` para `PublicationCard`.
- Handler abre o `ChallengeContributeSheet` existente com `preselectedTierCents={tierCents}`.

`src/components/payments/ChallengeContributeSheet.tsx`
- Aceitar prop opcional `preselectedTierCents?: number`. Quando presente, iniciar o estado da faixa selecionada com esse valor (mantém fluxo Pix atual sem outras mudanças).

## Fora de escopo

- Alterar overlay de bloqueio da mídia.
- Novos endpoints de pagamento (a contribuição continua no fluxo já implementado).
- Página pública dedicada do desafio.
