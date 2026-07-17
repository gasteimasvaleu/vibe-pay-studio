## Escopo

Na aba **Visão geral › Destaques** (`DestaquesPanel` em `src/routes/_authenticated/my-monetisex-stats.tsx`), os cards **Top postagem**, **Top Live** e **Top assinantes** hoje só mostram o item de maior faturamento, sem abas. Vou adicionar as abas mostradas no screenshot, cada uma refazendo a query com o critério certo e atualizando o item exibido.

Nenhuma outra página é alterada. Sem novas tabelas nem novas server functions — as existentes já aceitam os parâmetros necessários.

## Mudanças

1. **Top postagem** — chips `Mais vendida | Mimos | Curtidas | Comentários`, mapeando para `getEngajamentoPublicacoes({ sort })` (`revenue | tips | likes | comments`). Card exibe o primeiro item retornado no critério selecionado.
2. **Top Live** — chips `Mais vendida | Mimos`, mapeando para `getEngajamentoLives({ sort })` (`revenue | tips`). Mesma lógica de primeiro item.
3. **Top assinantes** — chips `Total | Mais assinaturas | Mimos | Chat`, mapeando para `getTopAssinantes({ metric })` (`total | subscription | tip | chat_unlock`). Lista continua top 5.

## Detalhes técnicos

- Cada card vira um subcomponente com seu próprio `useState` da aba e sua própria `useQuery` cuja `queryKey` inclui o critério — trocar aba refaz o fetch (com cache de 30s por combinação, como o resto da página).
- Reutiliza o componente `Chip` já existente para manter o visual das abas idêntico ao restante da página (padrão que o screenshot mostra).
- Estados: skeleton enquanto carrega, mensagem "Nenhuma … no período." quando vazio, mantendo os textos atuais.
- Sem alterações em `src/lib/stats.functions.ts`, RLS ou tipos.
