## Problema

As abas "Postagens" e "Mídias" no header do perfil (`/profile/$username`) mostram um número que **não bate com o que a lista realmente renderiza abaixo**.

Confirmei consultando o banco para `monetisex` (perfil pago):
- Contagem exibida hoje: **3 Postagens / 3 Mídias**
- Publicações realmente visíveis (published_at ≤ agora, approved, não arquivadas): **1**
- A contagem atual conta rascunhos, agendadas futuras, arquivadas e itens pendentes/removidos pela moderação.

Causa: em `loadProfile` (`src/routes/_authenticated/profile.$username.tsx`, linhas 94–108), o `count` filtra apenas por `author_id` + `creator_profile_id`, sem os filtros de visibilidade que `fetchUserPubs`/`fetchMedias` aplicam ao listar.

## Correção

Alinhar os contadores exatamente com o critério das listas exibidas (o mesmo usado por `fetchUserPubs` / `fetchMedias`):

- `published_at IS NOT NULL` e `published_at <= now()`
- `archived_at IS NULL`
- `moderation_status = 'approved'`
- Manter o filtro por `creator_profile_id` quando houver (isolamento paid vs free)
- Para mídias, aplicar os mesmos filtros via `publications!inner(...)`

Além disso, quando o viewer é o próprio dono do perfil, considerar se agendadas/arquivadas devem ou não entrar. Proposta: **manter apenas o que aparece na listagem pública** para que o número sempre bata com o que o usuário vê rolando — agendadas/arquivadas continuam acessíveis nas telas próprias (`/publicacoes-agendadas`, coleções).

## Arquivos

- `src/routes/_authenticated/profile.$username.tsx` — atualizar `pubsQuery` e `mediasQuery` dentro de `loadProfile` com os mesmos filtros de visibilidade das listas.

Sem mudanças de schema, RLS ou UI — apenas ajuste das queries de contagem.
