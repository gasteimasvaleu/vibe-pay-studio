## Objetivo
O botão de perfil na `TopNav` (canto superior direito) hoje mostra apenas a inicial "M" sobre um gradiente. Deve exibir a foto do perfil do usuário logado (respeitando o perfil ativo: creator ou gratuito).

## Mudanças
Arquivo: `src/components/site/TopNav.tsx`

1. Além do `supabase.auth.getUser()`, buscar de `public.profiles` as colunas `avatar_url`, `free_avatar_url` e `active_view` para o `user_id` atual.
2. Resolver o avatar a exibir:
   - Se `active_view === 'free'` → usar `free_avatar_url ?? avatar_url`.
   - Senão → `avatar_url`.
3. Renderizar no `<Link to="/dashboard">`:
   - Se houver URL: `<img>` circular (`h-9 w-9 rounded-full object-cover ring-1 ring-border`) com `alt="Meu painel"`.
   - Fallback (sem avatar): manter o círculo com gradiente e a inicial atual.
4. Manter o mesmo tamanho/estilo do botão para não deslocar o layout.

Sem alterações em backend, rotas ou outras UIs.
