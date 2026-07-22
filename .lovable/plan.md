## Problema

Na busca (`/search`) aparece apenas 1 dos 2 perfis do dono do Monetisex (só `monetisex`, faltando `monetisexy2`), embora ambos existam em `creator_profiles` e passem por todos os filtros de privacidade.

## Causa raiz (confirmada)

A query do `src/routes/_authenticated/search.tsx` embeda `profiles!inner(...)` a partir de `creator_profiles`. PostgREST resolve o embed procurando uma FK entre as duas tabelas, e existe **uma única FK direta**:

```
profiles.active_profile_id → creator_profiles.id
```

Logo o "inner join" na verdade é `profiles.active_profile_id = creator_profiles.id`, ou seja, PostgREST só devolve o creator_profile que está marcado como **perfil ativo** do dono. Todos os outros perfis do mesmo usuário (o segundo perfil, o free, etc.) são descartados.

Confirmado via chamada real ao PostgREST: a query retorna apenas `monetisex` (o perfil ativo do dono), e `monetisexy2` é omitido.

Não é RLS, não é filtro de país, não é o `viewerId !== user_id` — os dois perfis passariam.

## Correção

Trocar a resolução do join para ser explicitamente por `user_id`, criando uma VIEW dedicada à busca que já traz as flags de privacidade do dono.

### 1. Migração SQL

Criar `public.creator_profiles_search` como VIEW com `security_invoker=on`:

- Colunas: `id, user_id, username, display_name, avatar_url, cover_url, created_at, kyc_verified_at, country, restrict_search, restrict_search_br, restrict_search_country, restrict_mentions`.
- Join: `creator_profiles cp JOIN profiles p ON p.user_id = cp.user_id`.
- `GRANT SELECT ON public.creator_profiles_search TO anon, authenticated;`
- Não altera RLS das tabelas base (segue o SELECT permissivo já existente de `creator_profiles` e `profiles`).

### 2. Ajuste em `src/routes/_authenticated/search.tsx`

- Trocar `.from("creator_profiles").select("..., profiles!inner(...)")` por `.from("creator_profiles_search").select("id, user_id, username, display_name, avatar_url, cover_url, kyc_verified_at, country, restrict_search, restrict_search_br, restrict_search_country, restrict_mentions")`.
- Filtros passam a ser aplicados diretamente nas colunas (sem `foreignTable`):
  - `q.eq("restrict_search", false)`
  - Se `viewerCountry === "BR"`: `q.eq("restrict_search_br", false)`
  - Se `viewerCountry`: `q.or("restrict_search_country.eq.false,country.neq.${viewerCountry},country.is.null")`
  - Se `isMentionLookup`: `q.eq("restrict_mentions", false)`
- `fetchCreators` continua mapeando para o mesmo `CreatorRow` (agora `kyc_verified_at` vem direto da linha).

### 3. Verificação

- Após a migração: `curl` no endpoint da VIEW confirmando que retorna os 2 perfis do dono do Monetisex.
- Abrir `/search` deslogado e como `sexandoapp7@hotmail.com`: os cards `monetisex` e `monetisexy2` aparecem em "Mais buscados".
- Buscar por `monet` retorna ambos.
- Perfil próprio continua excluído pelo filtro `user_id !== viewerId`.

## Fora de escopo

- Não mexer nas flags de privacidade nem na FK `profiles.active_profile_id`.
- Não alterar outras telas que usam `creator_profiles` — só a busca tem esse embed problemático.