## Objetivo
Reduzir a tipografia e o peso de valores/títulos ainda "gigantes" para o mesmo nível sutil aplicado ao dashboard. Trabalho puramente visual (classes Tailwind), sem tocar em lógica ou dados.

## 1. `src/routes/_authenticated/my-monetisex-stats.tsx`
Padrão a aplicar em todos os painéis (Resumo, Faturamento, Assinantes, Projeção, Ganhos por produto, Alcance, Engajamento, Top Postagem, Top Live, Top Assinantes, Superfãs):

- Títulos de card `text-lg font-bold` → `text-sm font-semibold`.
- Títulos "base" `text-base font-bold` → `text-sm font-semibold`.
- Valores destacados `text-2xl font-bold` → `text-lg font-semibold`.
- Valores "hoje/no período" `text-xl font-bold` → `text-base font-semibold`.
- Valores secundários `text-lg font-bold` → `text-sm font-semibold`.
- Labels de filtro `text-sm font-bold` → `text-xs font-semibold`.
- Totais em linhas `font-bold` → `font-semibold`.
- Sub-cards internos `p-3` mantidos, mas rótulos numéricos passam de `text-lg font-bold` → `text-base font-semibold`.
- Streaks `text-2xl font-bold` (Atividade no mês) → `text-lg font-semibold`.
- Visitantes `text-xl font-bold` → `text-base font-semibold`.

Não altero ícones, cores, layout ou grid.

## 2. Aplicar mesma redução em outras telas com o mesmo problema

### `src/routes/_authenticated/settings.subscription.tsx`
- Valor mensal `text-4xl md:text-5xl font-extrabold` → `text-2xl font-semibold`.
- Trimestral/Semestral `text-xl md:text-2xl font-bold` → `text-base font-semibold`.
- Paddings `p-6 md:p-8` → `p-5`; `space-y-5` → `space-y-4`.
- Blocos de input `px-5 py-3` → `px-4 py-2.5`, texto `text-base` → `text-sm`.

### `src/components/promotion/PromotionShell.tsx` (wizard Criando oferta)
- `PromotionHeader.title` `text-2xl md:text-3xl font-bold` → `text-lg font-semibold`.
- Subtítulo `text-sm` → `text-xs`; margens `mb-8/mb-5` → `mb-6/mb-4`.
- Progresso `h-1.5` → `h-1`.

### `src/routes/_authenticated/banco.tsx`
- Saldo `text-3xl font-bold` → `text-xl font-semibold`.

### `src/routes/_authenticated/mywallet.index.tsx`
- Saldo `text-3xl font-bold` → `text-xl font-semibold`.

### `src/routes/_authenticated/mywallet.recarregar.tsx`
- Valor `text-4xl md:text-5xl font-extrabold` → `text-2xl font-semibold`.

### `src/routes/_authenticated/chat-agendamento.tsx` (linha 785)
- Valor `text-4xl font-semibold` → `text-2xl font-semibold`.

### `src/components/payments/TipDialog.tsx` (linha 168)
- Valor `text-4xl font-extrabold` → `text-2xl font-semibold`.

### `src/components/live/LiveTicketDialog.tsx` (linha 151)
- Valor `text-3xl font-extrabold` → `text-xl font-semibold`.

### `src/components/payments/ChallengeContributeSheet.tsx`
- `text-2xl font-black` → `text-lg font-semibold`; `text-lg font-black` → `text-sm font-semibold`.

## Fora do escopo
Não altero páginas de onboarding (`creator.onboarding.*`), perfil público (`perfil.$username.tsx`), landing/hero, publisher (câmera fullscreen) nem componentes onde a fonte grande faz parte do design intencional (ex.: rank em `em-alta/Cards.tsx`, floating reactions).
