## Objetivo

Alinhar a aba **Lives** com a aba **Publicações**: mesmas 5 abas em "Ordenar por" (Mais compradas, Mimos, Visualizações, Comentários, Curtidas), ordenando a lista e alimentando o gráfico do card abaixo com a métrica selecionada.

## 1. Banco de dados (migration)

Criar duas tabelas para suportar curtidas e comentários em lives (hoje não existem).

**`public.live_likes`**
- `live_id uuid` → `live_sessions(id) ON DELETE CASCADE`
- `user_id uuid` (auth user)
- `created_at timestamptz`
- `UNIQUE (live_id, user_id)`
- GRANTs: `SELECT, INSERT, DELETE` para `authenticated`; `ALL` para `service_role`
- RLS: leitura pública autenticada; insert/delete apenas do próprio `user_id`

**`public.live_comments`**
- `live_id uuid` → `live_sessions(id) ON DELETE CASCADE`
- `user_id uuid`
- `content text NOT NULL`
- `created_at timestamptz`, `updated_at timestamptz` (+ trigger `set_updated_at`)
- GRANTs equivalentes
- RLS: leitura para authenticated; insert do próprio user; update/delete do autor ou admin

Índices: `(live_id)` em ambas.

## 2. Backend — `src/lib/stats.functions.ts`

Estender `getEngajamentoLives`:

- Aceitar `sort: "revenue" | "tips" | "views" | "likes" | "comments"`.
- Após buscar `live_sessions`, buscar em paralelo agregados por `live_id`:
  - `live_likes` → `count` por `live_id`
  - `live_comments` → `count` por `live_id`
- Anexar `likes` e `comments` em cada item retornado.
- Adicionar sorters `likes` e `comments`.
- Somar `totalLikes` e `totalComments` no retorno (opcional; útil para o card Resumo futuramente).

## 3. UI — `src/routes/_authenticated/my-monetisex-stats.tsx`

- `ORDENAR_LIVES = ["Mais compradas", "Mimos", "Visualizações", "Comentários", "Curtidas"]`.
- `liveSortMap`: adicionar `"Comentários": "comments"`, `"Curtidas": "likes"`.
- No `cfg` do `EngajamentoChart` (bloco `isLives`), adicionar:
  - `Comentários`: `{ label: "Comentários", format: "int", get: l => l.comments ?? 0 }`
  - `Curtidas`: `{ label: "Curtidas", format: "int", get: l => l.likes ?? 0 }`

Nenhuma outra alteração de layout — os chips já são renderizados dinamicamente a partir de `ORDENAR_LIVES`.

## Detalhes técnicos

- Enquanto não houver UI de curtir/comentar em lives, as contagens serão 0 e o gráfico refletirá zero nessas abas — comportamento esperado.
- Tipos do Supabase (`src/integrations/supabase/types.ts`) são regenerados após a migration aprovada; o código do server fn depende disso e é feito depois.
