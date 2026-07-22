## Ajuste de altura do header "Conversas"

O header da sidebar (`chat.tsx`, linha 153) usa `pt-6 pb-3`, ficando mais alto que o header direito da conversa, que é `h-16` fixo (`chat.$threadId.tsx`, linha 266).

### Alteração
- Em `src/routes/_authenticated/chat.tsx`, trocar `px-4 pt-6 pb-3 flex items-center justify-between` por `h-16 shrink-0 px-4 flex items-center justify-between border-b border-border`, alinhando exatamente com a altura (`h-16`) do header da direita e mantendo a divisória inferior.
