
## Objetivo

Refatorar o fluxo do "Desafio" no publisher para usar bottom sheets em vez de dialog centralizado, adicionar uma segunda etapa para definir as faixas de contribuição, e depois abrir automaticamente o sheet de prévia (obrigatório para toda mídia paga).

## Escopo

Apenas UI/estado no frontend do publisher. Nada muda em backend/tipos de submissão além de expandir o payload local do toggle `challenge` para carregar as faixas.

## Alterações

### 1. `src/routes/_authenticated/publisher.tsx` — sheet 1 (meta do desafio)

- Trocar o `<Dialog>` do `PriceDialog` interno (linhas 1517–1601) por um `<Sheet side="bottom">` **apenas quando usado para o desafio** (o mesmo componente é usado para "Paid", então introduzir um novo componente `ChallengeGoalSheet` em vez de mudar o `PriceDialog` genérico).
- Largura preservada via `className="mx-auto w-full sm:max-w-[420px] rounded-t-3xl"` no `SheetContent`, mesmo visual que hoje (contador com − / +, slider, min/máx, botão "Avançar").
- Título "Criando desafio", com botão back (seta) à esquerda e X à direita conforme o screenshot.
- Ao clicar em "Avançar", fechar este sheet e abrir o sheet 2 (faixas), passando `goalCents`.

### 2. `src/routes/_authenticated/publisher.tsx` — sheet 2 (faixas de contribuição)

Novo componente `ChallengeTiersSheet` (bottom sheet, mesma largura).

- Header: seta voltar (reabre sheet 1 mantendo valor), título "Criando desafio", X (fecha tudo e desmarca o toggle).
- Bloco superior: "Valor do desafio" + `R$ XX,XX` em destaque (readonly, vindo da etapa anterior).
- Lista de faixas:
  - Primeira faixa fixa (R$ 5,00), sem botão de remover, readonly.
  - 3 faixas sugeridas automaticamente ao abrir: `goal * 0.25`, `goal * 0.5`, `goal * 0.75`, arredondadas para múltiplos de R$ 0,50 e limitadas ao intervalo [R$ 5,00, goal]. Cada uma é editável (input com máscara R$) e removível (X à direita).
  - Botão discreto "Adicionar faixa" abaixo da lista (limite 8 no total; cada nova entra vazia para o usuário digitar).
- Validação: valores > 0, ≤ meta, sem duplicatas; botão "Confirmar" desabilitado se inválido.
- Botão "Confirmar" (largura total, gradiente): salva `{ enabled: true, goalCents, tiersCents: number[] }` em `toggles.challenge`, fecha o sheet e abre imediatamente `previewSheetOpen = true` (já existe — reutilizar).

### 3. Estado / payload do toggle

- Ampliar `toggles.challenge` de `{ enabled, priceCents }` para `{ enabled, goalCents, tiersCents }`.
- Renomear referências locais (`priceCents` → `goalCents`) e atualizar o resumo mostrado no `ActionRow` "Desafio" (usa `goalCents` como valor exibido, igual a hoje).
- No `handleSubmit`, manter `challengeCents: goalCents` (chave já existente) e adicionar `challengeTiersCents: number[]` no payload — o backend hoje ignora o campo extra; a persistência real das faixas fica como próximo passo.

### 4. Reaproveitar o sheet de prévia existente

Não criar novo componente: após "Confirmar" no sheet de faixas, chamar `setPreviewSheetOpen(true)`. Mesma lógica que já é feita para o toggle "Paid" (linha 926).

## Fora de escopo

- Persistência das faixas no banco / edge function (backend do desafio).
- Fluxo de contribuição/pagamento em Pix por faixa.
- Tela pública do desafio com barra de progresso da meta.

Depois de aprovado, implemento apenas as três mudanças de UI acima.
