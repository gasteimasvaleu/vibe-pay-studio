## Situação atual

A rota `/postsarquivados` existe e o item de menu "Postagens arquivadas" já aparece em `/settings/creator` tanto para creators pagos quanto para creators free (`accountType !== "subscriber"`).

O problema é que a função `getArchivedPublications` filtra apenas por `author_id`, não por `creator_profile_id`. Como um usuário pode ter dois perfis (pago + free) vinculados à mesma conta, posts arquivados de ambos os perfis aparecem misturados, independentemente de qual perfil está ativo.

## O que será feito

1. **Isolar posts arquivados pelo perfil ativo**
   - Atualizar `getArchivedPublications` em `src/lib/publications.functions.ts` para usar `getActiveProfileIdFor` e filtrar por `creator_profile_id`.
   - Se o usuário não tiver nenhum creator_profile, a função retorna lista vazia (mantendo segurança).

2. **Ajustar a página `/postsarquivados`**
   - Garantir que o `queryKey` e a chamada reflitam o perfil ativo.
   - Adicionar um pequeno indicador visual opcional informando de qual perfil os posts arquivados estão sendo exibidos (pago vs free), se houver ambos.

3. **Manter ações consistentes**
   - Verificar `setPublicationArchived`: como o `creator_profile_id` é preenchido no insert pelo trigger `publications_fill_profile`, o arquivamento/des-arquivamento continua funcionando corretamente para cada perfil.

4. **Verificar navegação**
   - Confirmar que o link em `/settings/creator` continua visível para creators free e redireciona corretamente para `/postsarquivados`.

## Resultado esperado

- Creator free vê apenas os posts arquivados do seu perfil gratuito.
- Creator pago vê apenas os posts arquivados do seu perfil pago.
- Não há mistura de conteúdo entre os dois perfis vinculados à mesma conta.