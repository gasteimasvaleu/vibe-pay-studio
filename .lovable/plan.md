## Objetivo

No perfil próprio, "Editar perfil" deve levar para `/settings/creator` quando a conta for `creator`/`free_creator` (mantendo `/settings/myprofile` para assinantes).

## Mudanças em `src/routes/_authenticated/profile.$username.tsx`

1. Incluir `account_type` no `select` de `fetchProfileByUsername` e no tipo `ProfileData` (`accountType: AccountType`).
2. Importar `isCreatorLike` de `@/lib/auth`.
3. No botão da linha 267, trocar destino para:
   - `/settings/creator` se `isCreatorLike(profile.accountType)`
   - senão `/settings/myprofile`

Sem outras mudanças (o botão já é renderizado somente no perfil próprio).