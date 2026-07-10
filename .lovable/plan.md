## Criar página `/colecoes`

### 1. Nova rota `src/routes/_authenticated/colecoes.tsx`
- `createFileRoute("/_authenticated/colecoes")`
- `head()`: título "Coleções · Monetisexy" + `robots: noindex`
- Layout `max-w-3xl mx-auto`, header com botão voltar (mesmo padrão de `settings.creator.tsx`), título "Coleções"
- Barra de abas horizontal (scroll-x em mobile) com 5 tabs, estado local `useState`:
  - FAVORITOS (default ativo)
  - MINHAS COMPRAS
  - COMPRAS CHAT
  - OCULTADOS
  - MIMOS
- Tab ativa: pill com `bg-primary/15 text-primary`; inativas: `text-muted-foreground`
- Área de conteúdo: estado vazio centralizado com mensagem por aba:
  - FAVORITOS → "Você ainda não favoritou nenhum post."
  - MINHAS COMPRAS → "Você ainda não comprou nenhum post."
  - COMPRAS CHAT → "Você ainda não comprou nada no chat."
  - OCULTADOS → "Você não tem posts ocultos."
  - MIMOS → "Você ainda não recebeu mimos."

### 2. Editar `src/components/dashboard/SubscriberDashboard.tsx` (linha 71-75)
- Adicionar `to="/colecoes"` ao `ActionCard` "Atividades"

### 3. Editar `src/components/dashboard/CreatorDashboard.tsx` (linha 123)
- Mesmo `to="/colecoes"` no card "Atividades" do creator (mesmo destino faz sentido)

Sem persistência/dados reais — apenas UI e estados vazios como no screenshot.