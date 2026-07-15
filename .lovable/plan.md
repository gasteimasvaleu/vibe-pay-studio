## Diálogo de confirmação para arquivar/desarquivar

O post já sai automaticamente do feed e do perfil ao ser arquivado (server fns já filtram `archived_at IS NULL`), e já aparece em `/postsarquivados` — a invalidação de `["feed"]`, `["user-publications"]` e `["archived-posts"]` no `PublicationOptionsMenu` cuida disso. Falta apenas o diálogo de confirmação.

### Mudança única

Em `src/components/feed/PublicationOptionsMenu.tsx`:

1. Adicionar estado `confirmArchive` (boolean).
2. No `onClick` da opção "Arquivar/Desarquivar post", em vez de disparar `archiveMutation` direto, fechar o popover e abrir o novo `AlertDialog`.
3. Novo `<AlertDialog>` (reutilizando os componentes shadcn já usados para o "Excluir post"):
   - Ícone `AlertTriangle` (amarelo) em um círculo suave no topo, centralizado.
   - Título: "Arquivar postagem" (ou "Desarquivar postagem").
   - Descrição: "Tem certeza que deseja arquivar esta postagem? Ela ficará oculta da sua timeline." (ou "Ela voltará a aparecer na sua timeline.").
   - Botões lado a lado: **Confirmar** (primary, gradiente laranja/pink do app) e **Cancelar** (outline arredondado). Ambos `rounded-full` altos, como no screenshot, adaptados às cores do tema (não usar bege do mock).
   - Confirmar dispara `archiveMutation.mutate()`; loading state desabilita ambos.

### Fora de escopo
- Remoção otimista manual do cache (invalidação já basta).
- Alterações no fluxo de exclusão (que já tem seu próprio confirm).
- Mudanças nas server fns ou nas rotas.