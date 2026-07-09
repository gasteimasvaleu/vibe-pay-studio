## Aba "Ganhos por produto"

Adicionar renderização condicional em `ExtratosPanel` (src/routes/_authenticated/my-monetisex-stats.tsx) para que, quando `extratoTab === "Ganhos por produto"`, a coluna principal exiba um layout diferente. A coluna lateral direita (TopBadgeCard, Top5PaisesCard, ExtratoFaturamentoCard) permanece igual.

### Coluna principal quando "Ganhos por produto" está ativo

1. **Card "Ganhos por produto"** (novo componente `GanhosPorProdutoChartCard`):
   - Título "Ganhos por produto" em bold
   - Linha abaixo: `R$ 0,00` grande em bold + texto muted "total no período"
   - Legenda com 6 itens coloridos (bolinha + label):
     - Assinatura (roxo)
     - Live (azul)
     - Indicações (laranja)
     - Chamada 1:1 (verde)
     - Mimo (rosa/vermelho)
     - Publicação paga (cinza)
   - Área do gráfico com 2 linhas horizontais tracejadas rotuladas "R$ 0,01"
   - Eixo X com as mesmas 5 datas (Jun 9 → Jul 9, 2026)

2. **Card "Tabela por Produto"** (novo componente `GanhosPorProdutoTable`):
   - Cabeçalho com colunas: `Produto`, `Valor` (direita), `Sua comissão` (direita)
   - Uma linha "Total": bolinha laranja + "Total" bold à esquerda, `R$ 0,00` (Valor), `R$ 0,00` em laranja (Sua comissão)
   - Barra horizontal laranja full-width abaixo da linha (visual do screenshot)

Os filtros de topo (tabs + dropdown "Todos os produtos") continuam visíveis nesse modo. Os filtros "Filtrar por / Estornos / Exportar extrato" e a tabela de vendas não aparecem nesta aba.

### Detalhes técnicos

- Cores da legenda usando classes Tailwind com cores fixas do design (aprox.): `bg-purple-500`, `bg-blue-500`, `bg-primary` (laranja), `bg-emerald-500`, `bg-rose-500`, `bg-slate-400`.
- Barra laranja da tabela: `h-1 bg-primary w-full` logo abaixo da linha "Total".
- Nenhuma alteração em dados/backend — só estrutura e apresentação estáticas seguindo os screenshots.
