## Composer substitui a página do calendário (não abre como Sheet)

**Arquivo:** `src/routes/_authenticated/chat-agendamento.tsx`

### Mudança
Hoje o composer é um `Sheet` que surge de baixo por cima da página do calendário. O usuário quer que o composer **substitua** a página do calendário na mesma rota (`/chat-agendamento`), e o dialog "DATA DE AGENDAMENTO" abra por cima dessa nova view.

### Implementação
- Trocar o state `composerOpen` por um modo de view: `view: "calendar" | "composer"` (via `useState`).
- Clique no "+" (header e empty state): `setView("composer")` + `setDateDialogOpen(true)`.
- Remover o wrapper `Sheet`/`SheetContent` do componente `Composer`. Renderizar o mesmo conteúdo (aside de contatos + section de mensagem) inline como layout de página quando `view === "composer"`.
- Botão de voltar (`ArrowLeft`) dentro do header "Mensagem em massa" volta para `view: "calendar"` em vez de fechar sheet. Adicionar também um botão "X" no topo direito com o mesmo comportamento (bate com o screenshot).
- Header do topo da rota (com título "Mensagens Agendadas") fica oculto quando `view === "composer"` — o composer traz o seu próprio header interno.
- `DateDialog` continua como `Dialog` (abre por cima do composer).
- Remover imports não utilizados (`Sheet`, `SheetContent`) se não forem mais usados.

### Fora de escopo
Nenhuma mudança em persistência, envio ou lógica de contatos.
