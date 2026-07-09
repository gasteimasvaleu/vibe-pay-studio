## Objetivo

Adicionar, logo abaixo do `ProfileHeaderCard` no `CreatorDashboard` (não no assinante), uma linha com 3 cards de resumo financeiro iguais aos do screenshot: **Faturamento / Hoje**, **Liberado / Valor disponível para saque**, **Total / Saldo liberado + a liberar**. Todos com valor `R$ -` (placeholder, sem dados reais por enquanto).

## Componente

Novo `src/components/dashboard/EarningsSummary.tsx` — puramente apresentacional, usa tokens semânticos (`bg-card`, `border`, `text-foreground`, `text-muted-foreground`, `shadow-[var(--shadow-card)]`).

Estrutura:
```
<section grid-cols-1 sm:grid-cols-3 gap-4>
  <Card title="Faturamento"  subtitle="Hoje"                          value="R$ -" />
  <Card title="Liberado"     subtitle="Valor disponível para saque"   value="R$ -" />
  <Card title="Total"        subtitle="Saldo liberado + a liberar"    value="R$ -" />
</section>
```

Cada card:
- `rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]`
- Título: `text-lg font-black text-foreground`
- Subtítulo: `text-sm text-muted-foreground mt-0.5`
- Valor: `text-3xl font-black text-foreground mt-4` (formato "R$ -" como placeholder)

Props opcionais pra ligarmos dados depois: `items?: { title; subtitle; value }[]` com default = os três acima. Assim quando você pedir para plugar Supabase é só passar valores.

## Onde entra

Em `src/components/dashboard/CreatorDashboard.tsx`, entre o `<DashboardShell>` (que renderiza o header) e o primeiro `<DashboardGroup title="Meu negócio">`. Ou seja, é o primeiro filho passado como `children` para o `DashboardShell`.

Não é adicionado no `SubscriberDashboard` — você pediu só na versão creator.

## Fora de escopo

- Valores reais (Faturamento hoje, saldo liberado etc. — placeholders `R$ -` até você pedir).
- Ações como "Sacar" ou link para carteira (só os 3 cards, como no screenshot).
- Ajuste dos `ActionCard`s (ainda no estilo dark antigo) — continua para uma próxima instrução.
