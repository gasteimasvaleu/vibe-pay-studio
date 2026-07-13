## Causa raiz

A RLS de `publication_media` chama `public.can_see_publication(uuid)`, mas essa função não tem `GRANT EXECUTE` para os roles `anon` / `authenticated`. Resultado: qualquer SELECT em `publication_media` (feito pelo `getFeed` como usuário autenticado ou pelo browser) falha com:

```
42501: permission denied for function can_see_publication
```

Por isso o `getFeed` devolve `media: []` — o card então renderiza só o áudio (a imagem existe no banco, mas nunca chega ao cliente).

## Plano

Migration única:

```sql
GRANT EXECUTE ON FUNCTION public.can_see_publication(uuid) TO anon, authenticated;
```

Também garantir `has_role` (usada dentro) para os mesmos roles, por segurança:

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
```

Nenhuma alteração no frontend é necessária — assim que a RLS parar de estourar, `media` volta populado e o `PublicationCard` já renderiza a imagem (o código de imagem+áudio juntos já foi implementado no turno anterior).

## Fora do escopo

- Refatorar a lógica de `can_see_publication`.
- Alterar policies existentes.