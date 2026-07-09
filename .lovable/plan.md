## Mover configurações do chat para página independente

Hoje `/chat/configuracoes` renderiza dentro do `<Outlet />` do layout `chat.tsx`, então a sidebar de conversas continua visível. Vou transformá-la em uma página totalmente separada.

### Mudanças
- Renomear `src/routes/_authenticated/chat.configuracoes.tsx` → `src/routes/_authenticated/chat-configuracoes.tsx` (nova URL: `/chat-configuracoes`), fora do layout `chat.tsx`. A página assume a tela cheia sob o layout `_authenticated` (mantendo apenas `AppTopBar`/`BottomNav` do app).
- Atualizar o ícone `Settings` na sidebar em `src/routes/_authenticated/chat.tsx` para apontar para `/chat-configuracoes`.
- Ajustar o botão "Voltar" da página para `navigate({ to: "/chat" })` (sem mudança de comportamento).
- Adicionar `AppTopBar` no topo da página para manter consistência com as outras telas fora do chat.

### Fora de escopo
- Layout interno (banner, toggle, compositor, botão salvar) permanece igual.
- Nenhuma alteração em outras rotas de chat.
