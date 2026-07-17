## Gráfico Faturamento × Quantidade no card de engajamento

Substituir o conteúdo do card grande (aba Publicações e Lives) por um gráfico combinado agrupando os itens por dia dentro do período selecionado.

### Layout do card
- Header (mantém): `N postagens/lives` + faturamento total à esquerda; à direita, legenda com dois pontos:
  - Roxo (`hsl(var(--primary))` — o roxo do tema) → **Faturamento**
  - Cinza (`hsl(var(--muted-foreground))`) → **Quantidade**
- Corpo: gráfico combinado (Recharts `ComposedChart`) ocupando ~260px de altura:
  - Barras cinza para quantidade de postagens/lives por dia (eixo Y direito)
  - Linha roxa para faturamento por dia em BRL (eixo Y esquerdo)
  - Eixo X: datas do período (formato curto dd/MM)
  - Tooltip com data, faturamento (BRL) e quantidade
- Se `items.length === 0`: manter mensagem "Sem dados de engajamento para o período selecionado."
- A lista de itens abaixo é **removida** deste card (as ações/detalhes já existem em Top postagem / Top live).

### Dados
Agregar `pubQ.data.items` (ou `liveQ.data.items`) no cliente:
- key: `publishedAt`/`started_at` truncado por dia (YYYY-MM-DD)
- `revenue`: soma de `revenue` (publicações) ou `gross_cents/100` (lives)
- `count`: contagem de itens
- Preencher dias sem dados com zeros entre `range.from` e `range.to` para eixo contínuo.

Sem mudanças de backend — usa os `items` já retornados por `getEngajamentoPublicacoes` / `getEngajamentoLives`.

### Alterações técnicas
Arquivo único: `src/routes/_authenticated/my-monetisex-stats.tsx`
- Importar `ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid` de `recharts`.
- Criar helper local `buildDailySeries(items, range, getDate, getRevenue)` que devolve `{ date, revenue, count }[]`.
- Trocar o bloco de listagem (linhas ~1069-1124) por: header + legenda + `<ResponsiveContainer>` com o `ComposedChart`.
- Cor da barra: `hsl(var(--muted-foreground))`; cor da linha e do ponto: `hsl(var(--primary))`.

### Validação
Rodar typecheck e conferir no preview que o gráfico aparece com dados reais, cores corretas e a mensagem de vazio quando o período não tiver dados.