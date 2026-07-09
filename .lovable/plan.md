## Aba "Extratos" — Meu Monetisex

Adicionar renderização condicional por `mainTab` em `src/routes/_authenticated/my-monetisex-stats.tsx`. Hoje só `subTab` altera o conteúdo — vamos passar a comutar a página inteira quando `mainTab === "Extratos"`, mantendo "Visão geral" intacta.

### Sub-abas próprias
Quando `mainTab === "Extratos"`, substituir a `SubTabsRow` por um conjunto próprio:
`Faturamento | Link de indicação | Ganhos por produto | Todos os produtos ▼` (o último é um dropdown com opções mock: Todos os produtos, Assinaturas, PPV, Mimos, Chat).

Estado local novo: `extratoTab` (default "Faturamento") e `produtoFilter` (default "Todos os produtos").

### Layout (grid 2/1, igual ao restante)

**Coluna principal (md:col-span-2), space-y-5:**

1. `ExtratoChartCard` — card com:
   - Header: título dinâmico (`produtoFilter`) + `R$ 0,00` grande + `(R$ 0,00 Bruto)` em `text-muted-foreground`; à direita legenda com dois pontos (● Faturamento em primary, ● Quantidade em muted).
   - Área de gráfico placeholder (h-64) com 3 linhas horizontais tracejadas rotuladas `R$0` e eixo x com Jun 9/Jun 16/Jun 24/Jul 2/Jul 9, 2026 (mesmo padrão do `EarningsChartCard` existente, só maior).

2. `ExtratoFiltrosRow` — "Filtrar por" à esquerda com chips `Todos | Concluídos | A receber | Estornos` (reusar `Chip`); "Exportar extrato" à direita como botão outline arredondado com ícone `ExternalLink`.

3. `ExtratoTable` — card com header `Data | Assinante | Valor | Sua comissão | Status` (grid 5 col, muted) e estado vazio centralizado "Nenhuma venda encontrada para este filtro." (pt-10 pb-6).

**Coluna lateral (space-y-5):**

- Reusar `TopBadgeCard` (Você está no top +100 / Faturamento hoje / Saldo liberado / Saldo a liberar / Acessar Meu Banco).
- Novo `Top5PaisesCard` — "Top 5 países" + subtítulo "Países onde você mais faturou" (sem lista, estado vazio).
- Novo `ExtratoFaturamentoCard` — título "Faturamento", bloco interno `rounded-xl bg-muted/60 p-4` com "Total" e `R$ 0,00`.

### Alterações em `MyMonetisexStatsPage`

- Ramificar o `<main>` por `mainTab`:
  - `"Visão geral"` → mantém o comportamento atual (subtabs Faturamento/Destaques/Sequência/Resumo).
  - `"Extratos"` → renderiza `<ExtratosPanel />` (contém as sub-abas próprias + layout descrito).
  - Demais `mainTab` (Engajamento/Alcance/Assinantes) → mantêm o layout atual por ora (fora do escopo).

### Detalhes

- Nenhuma lógica de dados; tudo mock estático coerente com o resto da página.
- Reusar tokens já usados: `rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]`, `Chip`, `MessageCircle`, `Info`, ícones do `lucide-react` (`ExternalLink`, `ChevronDown`).
- O texto "Monetisex" continua substituindo "Privacy" em títulos/mensagens (padrão do arquivo).
