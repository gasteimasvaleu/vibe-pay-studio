# Stories do admin visíveis para todos no feed

## O que está acontecendo

O story publicado por @monetisexy existe e está ativo (expira em 05/08). O usuário @newton_3441f6cb não vê o carrossel porque ele não segue ninguém (0 follows), e a lista de rings de stories hoje só considera:

- personas que o usuário segue,
- follows antigos sem persona,
- a própria persona ativa do usuário.

Ou seja: as publicações do admin já aparecem para todos no feed (o feed usa `admin_user_ids`), mas os **stories** ainda seguem apenas a regra de "quem eu sigo". Daí o carrossel ficar vazio, com a mensagem "Nenhum story dos creators que você segue no momento".

As permissões do banco não são o problema — qualquer usuário autenticado pode ler stories ativos.

## O que será feito

Aplicar aos stories a mesma regra já usada nas publicações: stories de contas admin aparecem para todos, seguindo ou não.

- Incluir os IDs de admin na busca de stories do feed.
- Manter a ordenação atual (seu story primeiro, depois não vistos, depois mais recentes).
- Ajustar o texto de estado vazio para não prometer "creators que você segue" quando não houver nada.

## Detalhes técnicos

Em `src/lib/stories.functions.ts`, dentro de `getFeedStoryRings`:

- Chamar `context.supabase.rpc("admin_user_ids")` em paralelo com os follows (mesmo padrão de `getFeed` em `src/lib/publications.functions.ts`).
- Adicionar esses IDs em `legacyFolloweeIds`/lista de `creator_id`, gerando uma cláusula `creator_id.in.(...)` no `.or(...)`.
- Ajustar o early-return: não retornar `[]` quando houver admins, mesmo sem follows nem persona própria.
- `is_self` continua calculado como hoje, então o story do próprio admin não duplica.

Nenhuma migração de banco é necessária.
