## Sub-aba "Lives" (dentro de Engajamento)

Atualizar `EngajamentoPanel` em `src/routes/_authenticated/my-monetisex-stats.tsx` para renderizar conteúdo diferente quando `tab === "Lives"`. Sub-tabs Publicações/Lives permanecem iguais no topo.

### Quando "Lives" está ativa

**Ordenar por** (chips diferentes):
- `Mais compradas` (ativa por padrão)
- `Mimos`
- `Visualizações`
- `Comentários`
- `Curtidas`

**Coluna principal:**
- Card com header: `0 compras  R$ 0,00` (bold) à esquerda, legenda "● Faturamento  ● Quantidade" à direita
- Corpo vazio (mais alto que Publicações) com texto centralizado muted: "Sem dados de engajamento para o período selecionado."
- (Sem texto adicional "Nenhuma publicação encontrada" abaixo do card)

**Coluna lateral:**
- Card `Resumo`:
  - Ícone `Radio` (ondas) → "Quantidade" / "0"
  - Ícone `Eye` → "Visualizações" / "0"
  - Ícone `DollarSign` → "Faturamento" / "R$ 0,00"
  - Layout: grid 2 colunas, com Faturamento ocupando linha própria abaixo (como no screenshot)
- Card `Top live`:
  - Título "Top live" bold
  - Texto muted: "Sem dados de engajamento para o período selecionado."

### Detalhes técnicos

- Novo ícone lucide: `Eye`.
- Manter estado `ordenar` separado por aba ou resetar ao trocar — resetar para o primeiro valor da lista de cada aba ao mudar.
- Extrair renderização condicional dos chips de ordenação e dos painéis (esquerda/direita) baseado em `tab`.
