Ao clicar no botão "Filtros" (`ListFilter`) na sidebar do chat, abrir um `Dialog` (shadcn, mesmo padrão já usado no `NewChatDialog`) com o layout do screenshot, adaptado às cores do app.

## Alterações

### 1. Novo componente `FiltersDialog` em `src/routes/_authenticated/chat.tsx`

Estado local no `ChatLayout`:
- `openFilters: boolean`
- `filters: { unread: boolean; interactions: boolean; favorites: boolean; muted: boolean; topBuyers: boolean; sort: "recent" | "oldest" }` — default `sort: "recent"`, todos os booleans `false`.

Estrutura do dialog (usando `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` já importados):

- **Título**: "Filtrar por" (o `X` de fechar já vem do `DialogContent` padrão do shadcn — mantém consistência com o resto do app; não replicamos o botão do screenshot).
- **Seção "Conversas"** (`text-sm font-semibold text-foreground` + `flex flex-wrap gap-2`):
  - Chip "Não lidas" — toggle `filters.unread`.
  - Chip "Interações" — toggle `filters.interactions`.
- **Seção "Usuários"**:
  - Chip "Favoritos" — toggle `filters.favorites`.
  - Chip "Silenciados" — toggle `filters.muted`.
  - Chip "Top compradores" — toggle `filters.topBuyers`.
- **Seção "Ordenar"** (single-select, sempre um selecionado):
  - Chip "Mais recentes".
  - Chip "Mais antigas".
- **Rodapé**: botão `Aplicar filtros` full-width — `variant="outline"` com `border-primary text-primary hover:bg-primary/10 rounded-full h-12` (espelha o estilo laranja outline do screenshot). Ao clicar, fecha o dialog (persistência real dos filtros fica fora de escopo — os filtros já ficam no estado do `ChatLayout` prontos para uso futuro).

Componente `FilterChip` reutilizável dentro do arquivo:
- `rounded-full px-4 py-2 text-sm font-medium transition-colors`
- Ativo: `bg-gradient-primary text-primary-foreground shadow-glow`
- Inativo: `bg-muted text-foreground hover:bg-accent`

### 2. Conectar o botão "Filtros"

No `IconBtn` com label "Filtros" (linha ~146), adicionar `onClick={() => setOpenFilters(true)}`.

Renderizar `<FiltersDialog open={openFilters} onOpenChange={setOpenFilters} filters={filters} onChange={setFilters} />` junto ao `NewChatDialog` no final do `ChatLayout`.

## Fora de escopo

- Aplicar de fato a filtragem/ordenação sobre `threads` (o estado fica pronto, integração fica para uma próxima iteração).
- Persistir filtros entre sessões.
- Qualquer alteração fora de `src/routes/_authenticated/chat.tsx`.
