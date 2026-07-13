## Objetivo

Adicionar às mensagens do sheet de comentários as funções: curtir, responder, excluir (via menu ...) e barra de "respondendo a", conforme screenshots.

## Mudanças

### 1. Backend — `src/lib/publications.functions.ts`
- `listComments`: retornar também `like_count`, `viewer_liked` e `parent_id` para cada comentário.
- `addComment`: aceitar `parentId?: string` opcional (para respostas) e persistir.
- Novas server functions:
  - `toggleCommentLike({ commentId })` — insere/remove em `publication_comment_likes` e retorna `{ liked, likeCount }`.
  - `deleteComment({ commentId })` — apaga apenas se `author_id = userId`.

### 2. Banco — nova migration
- Coluna `parent_id uuid null references publication_comments(id) on delete cascade` em `publication_comments` (se ainda não existir).
- Tabela `publication_comment_likes (comment_id uuid, user_id uuid, created_at, primary key (comment_id, user_id))` com GRANTs e RLS:
  - SELECT: authenticated
  - INSERT/DELETE: apenas o próprio `user_id`

### 3. UI — `src/components/feed/CommentsSheet.tsx`
Para cada item da lista, seguindo o screenshot:
- Linha superior: `@username` · tempo. À direita: botão `⋮` (menu) e botão coração com contador.
- Corpo do comentário abaixo.
- Botão "Responder" em texto pequeno, sob o comentário.
- Menu `⋮`: popover com "Excluir comentário" (ícone lixeira, destaque). Só exibe a opção Excluir quando o comentário for do usuário atual.
- Coração: alterna curtida via `toggleCommentLike` com atualização otimista; contador ao lado quando > 0.
- Estado `replyingTo: { id, username } | null`.
  - Ao clicar em "Responder": define replyingTo, prefixa input com `@username `, foca input.
  - Acima do input, aparece barra "Respondendo a @username" com botão `X` para cancelar.
  - Ao enviar, chama `addComment` com `parentId`.

### 4. Detalhes visuais
- Botão coração usa `Heart` do lucide, filled quando `viewer_liked`.
- Menu usa `Popover` (mesmo padrão de `PublicationOptionsMenu.tsx`), `align="end"`.
- Barra "Respondendo a" com fundo `bg-muted`, botão `X` do lado direito.
- Sem mudanças no design system global; usa tokens existentes.

## Fora de escopo
- Threading visual (indentação de respostas). Respostas aparecem como comentários normais listados em ordem cronológica, mas armazenam `parent_id` para uso futuro.
- Edição de comentário.
