## Objetivo

Agrupar respostas (replies) sob o comentário pai no `CommentsSheet`, com um toggle "Ver N respostas" / "Ocultar respostas" para expandir e recolher a thread — igual aos screenshots.

## Contexto

- `publication_comments` já tem `parent_id` e `addComment` já aceita `parentId`.
- `listComments` retorna a lista plana (pais + respostas misturadas por `created_at`).
- Hoje respostas aparecem no mesmo nível do pai; não há indentação nem toggle.

## Mudanças (somente frontend)

### `src/components/feed/CommentsSheet.tsx`

1. **Agrupar em memória**: derivar `roots` (comentários sem `parent_id`) e `repliesByParent: Record<string, PublicationComment[]>` a partir de `query.data`, ordenados por `created_at` asc.
2. **Estado local**: `const [expanded, setExpanded] = useState<Set<string>>(new Set())` — quais threads estão abertas.
3. **Render**:
   - Renderizar apenas `roots` no `<ul>` principal.
   - Abaixo de cada root com `replies.length > 0`, um botão toggle no estilo do print:
     - Recolhido: `— Ver N resposta(s)`
     - Expandido: `— Ocultar respostas`
     - Alinhado à esquerda do conteúdo do comentário (com o mesmo padding do avatar + traço horizontal curto `<span className="h-px w-6 bg-border" />`, texto em `text-sm font-semibold text-muted-foreground`).
   - Quando expandido, renderizar `replies` indentados (ex.: `pl-12`) usando o mesmo layout de item (avatar menor `h-8 w-8`, mesmas ações de like/responder/excluir).
4. **Responder a uma reply**: `startReply` continua usando o `id` do comentário clicado como `parentId`; ao criar uma resposta a uma reply, tratar como reply do mesmo root — em `onSuccess` do `mutation`, se `replyingTo` existir, encontrar o root ancestral (`comment.parent_id ?? comment.id`) e garantir que a thread desse root fique `expanded`.
5. **Exclusão**: manter `canDelete` atual; ao excluir um root que tem replies, a UI já se limpa via `setQueryData` (as replies somem junto com o root do agrupamento — comportamento consistente com o RLS).
6. **Contador de likes / botões**: sem mudança na lógica; apenas reaproveitar o mesmo bloco JSX para pai e reply (extrair um subcomponente local `CommentRow` para evitar duplicação).

Sem mudanças em backend, server functions, RLS ou schema.
