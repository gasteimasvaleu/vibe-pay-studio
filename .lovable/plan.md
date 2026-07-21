## Objetivo
No card de perfil na página `/settings/creator`, exibir o avatar real do usuário em vez de apenas a inicial do nome.

## Mudanças

### `src/routes/_authenticated/settings.creator.tsx`
1. No `beforeLoad`, incluir `avatar_url` no `select` da tabela `profiles` e retorná-lo no contexto.
2. Importar `AvatarImage` de `@/components/ui/avatar`.
3. No `<Avatar>` do card (linha 78), renderizar `<AvatarImage src={avatarUrl} alt={displayName} />` antes do `<AvatarFallback>`. O fallback (inicial) continua sendo exibido automaticamente quando não houver `avatar_url`.
