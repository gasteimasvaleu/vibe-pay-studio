## Gráfico por métrica selecionada

Hoje o gráfico do painel de Engajamento agrega sempre por faturamento × quantidade, sem reagir à aba "Ordenar por". Passar a exibir a métrica correspondente à aba ativa.

### Comportamento por aba
Publicações:
- **Recentes** → linha = Faturamento (BRL), barras = quantidade de postagens/dia
- **Faturamento** → linha = Faturamento (BRL), barras = quantidade
- **Mimos** → linha = Mimos (BRL), barras = quantidade
- **Curtidas** → linha = Curtidas (nº), barras = quantidade
- **Comentários** → linha = Comentários (nº), barras = quantidade

Lives:
- **Mais compradas** → linha = Faturamento (BRL), barras = qtd de lives
- **Mimos** → linha = Mimos (BRL), barras = qtd
- **Visualizações** → linha = Views (nº), barras = qtd

Legenda do card muda dinamicamente: "● {Métrica}   ● Quantidade" (roxo/cinza). Título mantém "N postagens/lives" + total de faturamento.

### Alterações técnicas
Arquivo único: `src/routes/_authenticated/my-monetisex-stats.tsx`.

1. Estender `EngajamentoChart` para aceitar props:
   - `metricLabel: string` (ex.: "Faturamento", "Mimos", "Curtidas", "Comentários", "Views")
   - `metricFormat: "brl" | "int"` (formata eixo Y esquerdo e tooltip)
   - `items: { date: string; metric: number }[]` (em vez de `revenue`)
2. Nas chamadas dentro do `EngajamentoPanel`:
   - Para publicações mapear `metric` a partir do item conforme `ordenarPub`:
     - `Recentes|Faturamento` → `p.revenue`
     - `Mimos` → `p.tips`
     - `Curtidas` → `p.likes`
     - `Comentários` → `p.comments`
   - Para lives:
     - `Mais compradas` → `l.gross_cents / 100`
     - `Mimos` → `l.tips_cents / 100`
     - `Visualizações` → `l.total_views`
3. Ajustar tickFormatter/tooltip formatter para usar `formatBRL` quando `metricFormat === "brl"`, senão inteiro.

Sem mudanças de backend — todos os campos já estão nos payloads de `getEngajamentoPublicacoes` e `getEngajamentoLives`.

### Validação
Alternar as abas e conferir que a linha (roxa) muda de escala/valor conforme a métrica, e a legenda reflete o rótulo correto.