## Objetivo

Criar `/promotion`, um fluxo step-by-step para o criador montar uma oferta promocional, acessível pelo card "Ofertas" no dashboard. Layout inspirado nos screenshots (topbar com voltar + título "Criando oferta" + barra de progresso, título grande, subtítulo, campo, botão fixo no rodapé "Avançar"/"Concluir") — adaptado ao tema escuro/gradient do site.

## Fluxo (8 passos)

1. **Nome** — input "Nome da campanha".
2. **Quantidade** — input numérico, mínimo 10 assinaturas.
3. **Duração** — select 1–7 dias.
4. **Gate de preço** — se `price_monthly < 21`, mostra "Ofertas indisponíveis" com CTA "Ir para assinaturas" (`/creator/onboarding/assinatura`). Caso contrário, pula.
5. **Desconto** — select 5%–60% (passos de 5), mostra card com Mensal vs Promocional.
6. **Descrição** — textarea, contador 0/100.
7. **Sucesso** — "Parabéns, sua oferta foi criada!" com mock do card de oferta.
8. **CTA final** — botão "Ver perfil" (primary gradient) + "Ver minhas ofertas" (outline).

## Arquivos

**Novos**
- `src/routes/_authenticated/promotion.tsx` — rota com wizard client-side (useState para step + form data). Head `noindex`. Sem loader auth-protegido; usa Supabase client para ler `price_monthly` do profile no mount.
- `src/components/promotion/PromotionShell.tsx` — shell reutilizável (topbar sticky com back, título "Criando oferta", progress bar; título/subtítulo; slot conteúdo; footer sticky com botão CTA).

**Editados**
- `src/components/dashboard/CreatorDashboard.tsx` — adicionar `to="/promotion"` no ActionCard "Ofertas".

## Design (adaptação ao tema)

- Fundo: `bg-background` (dark do app). Sem trocar para creme dos screenshots.
- Título grande: `text-2xl md:text-3xl font-bold tracking-tight` (peso 700, alinhado ao padrão recém-ajustado do dashboard).
- Subtítulo: `text-sm text-white/60`.
- Progress bar: trilho `bg-white/10`, preenchimento `bg-gradient-primary` (mesmo gradiente laranja/rosa do site).
- Inputs: `rounded-full` (pill) para nome/quantidade/descrição curta; textarea `rounded-2xl`; borda `border-white/10`, focus `border-fuchsia-400/60` (padrão do onboarding).
- Botão principal: `rounded-full bg-gradient-primary text-primary-foreground` com `disabled:opacity-50`.
- Botão outline (passo final): `rounded-full border border-white/15 bg-white/5`.
- Card de comparação (Mensal vs Promocional) reaproveita o padrão do onboarding de assinatura.

## Estado (client-side, sem persistir por enquanto)

```
{ name, quantity, durationDays, discountPct, description }
```
Submissão final é mock (`console.log` + avança para o passo de sucesso). TODO no código para futura server function `createPromotion`.

## Fora de escopo

- Sem migration/tabela `promotions` nesta iteração (só UI + fluxo).
- Sem página `/promotions` de listagem — botão "Ver minhas ofertas" leva a `/dashboard` como placeholder (comentado como TODO).
- Sem alterações nos outros ActionCards nem em outras páginas.
