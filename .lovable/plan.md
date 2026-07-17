## Card "Top postagem/Top live" com miniatura e dado real

O card pequeno na coluna direita do painel de Engajamento hoje mostra `items[0]` — que é o primeiro item da lista ordenada pelo filtro atual (Data / Faturamento / Mimos etc.), então nem sempre é o "top". Também não mostra miniatura.

### Ajustes
Arquivo: `src/routes/_authenticated/my-monetisex-stats.tsx`, no bloco do card (linhas ~1116-1133).

1. Calcular o item de maior faturamento independentemente da ordenação escolhida:
   - `topPub = [...(pubQ.data?.items ?? [])].sort((a,b)=>(b.revenue ?? 0) - (a.revenue ?? 0))[0]`
   - `topLive = [...(liveQ.data?.items ?? [])].sort((a,b)=>(b.gross_cents ?? 0) - (a.gross_cents ?? 0))[0]`

2. Renderizar layout com miniatura à esquerda:
   - Publicações: `<img src={topPub.previewUrl} />` (campo já retornado por `getEngajamentoPublicacoes`); fallback: `div` com `ImageIcon`.
   - Lives: `<img src={topLive.cover_url} />` (campo já existente em `live_sessions` e retornado por `getEngajamentoLives`); fallback: `div` com `Radio`.
   - Tamanho: `h-14 w-14 rounded-lg object-cover`.
3. À direita da miniatura: legenda/título (truncate) + faturamento em BRL + data curta.
4. Manter mensagem de vazio quando não houver item.

Sem mudanças de backend — `previewUrl` e `cover_url` já vêm do server.

### Validação
Recarregar preview e conferir que a miniatura aparece e que o item exibido é o de maior faturamento no período.