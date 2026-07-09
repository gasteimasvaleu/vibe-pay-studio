# Página "Meu Monetisex" (estatísticas)

Primeira fase: apenas o **layout** das telas enviadas, adaptado ao tema escuro/laranja do app. Dados reais ficam para uma etapa futura — por ora, valores zerados / mockados estáticos.

## 1. Nova rota

Arquivo: `src/routes/_authenticated/my-monetisex-stats.tsx`
- `createFileRoute("/_authenticated/my-monetisex-stats")`
- `head()` com `title: "Meu Monetisex · Monetisex"` e `robots: noindex`
- Componente `MyMonetisexStatsPage` (client-only, sem loader por enquanto)
- Estado local para tab principal e subtab (sem persistência)

## 2. Wiring do botão

`src/components/dashboard/CreatorDashboard.tsx`
- No `ActionCard` "Meu Monetisex" adicionar `to="/my-monetisex-stats"`.

## 3. Layout (fase 1 — só UI)

Reuso do padrão de `DashboardShell`: fundo `bg-background` + `--gradient-radial`, container `max-w-3xl mx-auto`, cabeçalho sticky com botão voltar (`router.history.back()`) e título centralizado **"Meu Monetisex"**.

Estrutura do conteúdo (empilhada em mobile, 2 colunas em `md:` — coluna esquerda larga, direita estreita, como nos screenshots):

```text
┌─ Header sticky ─────────────────────────────┐
│ ←    Meu Monetisex                          │
├─────────────────────────────────────────────┤
│ 📅 Últimos 30 dias   [ Jun 9 – Jul 9, 2026 ]│
├─────────────────────────────────────────────┤
│ Tabs: Visão geral | Extratos | Engajamento  │
│       Alcance | Assinantes                  │
│ Subtabs: Faturamento • Destaques •          │
│          Sequência de atividades • Resumo   │
├──────────────────────────┬──────────────────┤
│ Card "Últimos 30 dias"   │ Card top +100    │
│  R$ 0,00                 │  Faturamento hoje│
│  [gráfico placeholder]   │  ───             │
│  Jun 9 … Jul 9           │  R$0 / R$0       │
│                          │  Saldo lib/liber │
│                          │  [Acessar Banco] │
│ Tabela Produto/Valor/… ──┼──────────────────┤
│  ✓ Total   R$0,00  R$0,00│ Faturamento no   │
│                          │  período  R$0,00 │
└──────────────────────────┴──────────────────┘
```

### Componentes internos (definidos no mesmo arquivo por enquanto)
- `RangeSelector` — ícone calendário + label + chip com intervalo (visual only)
- `TabsRow` (principal) e `SubTabsRow` (chips) — botões controlados por `useState`, ativo com fundo `bg-primary/15` e texto `text-primary` (laranja do tema)
- `EarningsChartCard` — título, valor à direita, área do gráfico como placeholder (`div` com linhas horizontais + labels de data, sem lib de charts nesta fase)
- `ProductTable` — cabeçalho Produto / Valor / Sua comissão + linha Total com bolinha laranja de check (`lucide` `CheckCircle2`)
- `TopBadgeCard` — ícone chat + "Você está no top +100 da Monetisex!" + bloco "Faturamento hoje" com traço + grid 2 colunas Saldo liberado / a liberar + botão outline "Acessar Meu Banco" (link para `/dashboard` provisório)
- `PeriodTotalCard` — "Faturamento no período" + R$ 0,00

### Tema
- Todos os cartões: `rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]`
- Sem cores hardcoded — usar tokens (`text-foreground`, `text-muted-foreground`, `text-primary`, `bg-primary/10`, `border-border`).
- Adaptar o print (fundo bege claro) para o tema escuro atual do app; o laranja das tabs/badges mapeia para `--primary`.

## 4. Fora do escopo (fase 1)
- Sem chamadas de servidor, sem `createServerFn`, sem Supabase.
- Sem biblioteca de gráficos — placeholder visual.
- Sem seletor de datas funcional (só chip estático).
- Sem alterações em schema / migrations.

## 5. Detalhes técnicos
- Rota criada como filha de `_authenticated`, então já protegida pelo gate existente.
- `src/routeTree.gen.ts` é regenerado automaticamente.
- Após criar o arquivo: rodar `tsgo` para validar tipos.
