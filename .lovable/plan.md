## Objetivo
Substituir os valores fixos "212 Postagens" e "411 Mídias" nos tabs do perfil por contagens reais do banco.

## Mudanças em `src/routes/_authenticated/perfil.$username.tsx`

1. No `beforeLoad`, após carregar o `profile`, buscar as contagens em paralelo:
   - `postsCount`: `supabase.from("publications").select("id", { count: "exact", head: true }).eq("author_id", profile.user_id)`
   - `mediaCount`: `supabase.from("publication_media").select("id, publications!inner(author_id)", { count: "exact", head: true }).eq("publications.author_id", profile.user_id)`
   - Retornar `postsCount` e `mediaCount` (default 0) no contexto da rota.

2. No componente `PerfilPage`, ler `postsCount` e `mediaCount` do contexto e usar nos `TabsTrigger`:
   - `{postsCount} Postagens`
   - `{mediaCount} Mídias`

Sem outras alterações (mocks de posts/mídias permanecem — não foi pedido).
