# Página /search

## Objetivo
Criar página de busca de creators seguindo o layout do screenshot (cards com banner + avatar circular sobreposto), com funcionalidade real de busca no Supabase, e adicionar um ícone de lupa na `TopNav` que leva para essa página.

## Mudanças

### 1. `src/components/site/TopNav.tsx`
- Adicionar um botão-link `<Link to="/search">` com o ícone `Search` (lucide-react) à esquerda do avatar do perfil.
- Mesmo estilo do botão de perfil (h-9 w-9, hover, rounded-full) mas com fundo transparente e ícone em `text-foreground`.
- Agrupar lupa + avatar em uma `div` com `gap-2`.

### 2. `src/lib/publications.functions.ts` (ou novo `src/lib/search.functions.ts`)
- Nova server function `searchCreators({ query, limit, cursor })`:
  - Query em `profiles` filtrando por `username ILIKE %q%` OU `display_name ILIKE %q%`.
  - Retornar: `user_id, username, display_name, avatar_url, cover_url` + flag `verified` se existir na tabela (verificar schema; se não existir, omitir).
  - Paginação por cursor (created_at ou id).
  - Se `query` vazio, retornar creators "mais buscados" — por enquanto ordenar por `postsCount` desc ou simplesmente pelos mais recentes (fallback simples até termos métricas de busca).

### 3. `src/routes/_authenticated/search.tsx` (nova rota)
- Layout seguindo o screenshot:
  - Input de busca full-width no topo, com ícone de lupa à esquerda, placeholder `"Buscar por creators ou tópicos"`, arredondado, fundo `bg-muted`.
  - Debounce de ~300ms no input.
  - Título `Mais buscados` (bold) quando query vazia; `Resultados` quando há query.
  - Grid: `grid-cols-1 md:grid-cols-2 gap-4`.
  - **Card do creator** (replicar screenshot):
    - Container `rounded-2xl bg-card overflow-hidden shadow-sm relative`.
    - Banner (cover_url) em `h-32 w-full object-cover` no topo; fallback gradiente se ausente.
    - Área branca abaixo com `pl-28 pr-4 py-4` contendo `display_name` (bold) + badge de verificado (se aplicável) e `@username` em `text-muted-foreground`.
    - Avatar circular `h-24 w-24 rounded-full border-4 border-card` posicionado `absolute left-4 top-16` (sobreposto banner/área branca).
    - Card inteiro é `<Link to="/perfil/$username">`.
- Usar `useInfiniteQuery` + sentinel para scroll infinito (padrão do projeto — ver `useInfiniteScrollSentinel`).
- Head: title `Buscar · Monetisexy`, `robots: noindex`.

## Detalhes técnicos

- Rota em `_authenticated/` pois a TopNav só existe autenticado.
- Server function usa `requireSupabaseAuth` middleware (padrão do projeto para queries autenticadas), com Supabase client do context.
- Verificar antes se existe coluna `is_verified` em `profiles`; se não, omitir badge (ou usar mock consistente com o resto do app — checar `perfil.$username.tsx` para ver se já há esse conceito).
- Sanitizar `query` (escapar `%` e `_`) antes de passar ao `ILIKE`.
- Empty state quando query tem resultados zero: `"Nenhum creator encontrado para \"<q>\""`.

## Fora de escopo
- Busca por "tópicos" (só creators por ora — placeholder menciona ambos mas implementaremos só creators, como no screenshot).
- Métricas reais de "mais buscados" (usar fallback por ora).
