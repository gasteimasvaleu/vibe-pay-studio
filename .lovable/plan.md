# Aba "Destaques" — layout

Adicionar o conteúdo da subtab **Destaques** em `src/routes/_authenticated/my-monetisex-stats.tsx`. Fase de layout apenas — sem dados reais, sem menus funcionais.

## Renderização condicional
No corpo da página, quando `subTab === "Destaques"`, renderizar `<DestaquesPanel />` no lugar do bloco atual (`EarningsChartCard` + `ProductTable`). A coluna direita (TopBadgeCard + PeriodTotalCard) permanece igual.

## Novos componentes (no mesmo arquivo)

### `DestaquesPanel`
Empilha três cartões:
1. `TopPostagemCard`
2. `TopLiveCard`
3. `TopAssinantesCard`

### `TopPostagemCard`
- Ícone `Smartphone` (lucide) laranja + título **"Top postagem"** em negrito
- Linha de chips: `Mais vendida` (ativo), `Mimos`, `Curtidas`, `Comentários`
- Menu `MoreVertical` no canto superior direito (visual, sem dropdown funcional por enquanto)
- Estado vazio centralizado: **"Nenhuma postagem encontrada no período."** (`text-muted-foreground`)
- `rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]`

### `TopLiveCard`
- Ícone `Radio` laranja + título **"Top Live"**
- Chips: `Mais vendida` (ativo), `Mimos`
- `MoreVertical` no topo-direito
- Bloco inferior: quadrado cinza (`aspect-square w-32 rounded-xl bg-muted grid place-items-center`) com ícone `Radio` grande laranja + ao lado um chip pequeno com ícone `Lock` e traço (representando item bloqueado)

### `TopAssinantesCard`
- Ícone `Users` laranja + título **"Top assinantes"**
- Chips: `Total` (ativo), `Mais assinaturas`, `Mimos`, `Chat`
- Estado vazio: **"Sem dados para este filtro."** (`text-muted-foreground`, centralizado)

## Padrões reutilizados
- Chips: reaproveitar visual do `SubTabsRow` (pill com `bg-primary/15 text-primary border-primary/30` quando ativo, `bg-card text-muted-foreground border-border` quando inativo). Cada cartão terá seu próprio `useState` local para o chip selecionado.
- Ícone de menu `MoreVertical` como `button` com `text-muted-foreground hover:text-foreground` (sem dropdown ainda — o menu "Exibir estatísticas / Copiar link / Fixar post / Arquivar post" fica para uma etapa posterior).
- Todos os textos e ícones usam tokens (`text-primary`, `text-muted-foreground`, `text-foreground`) — sem cores hardcoded.

## Fora do escopo
- Sem dropdown funcional dos "3 pontinhos".
- Sem fetch de dados (postagens/lives/assinantes).
- Sem alterações em outras subtabs (Faturamento, Sequência de atividades, Resumo).
