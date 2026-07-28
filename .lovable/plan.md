## Problema

"monetisex" e "monetisexy" estão na lista `RESERVED_USERNAMES` (`src/lib/profile-active.server.ts`), então qualquer usuário — inclusive o dono do app — recebe "Este identificador é reservado" ao tentar salvar.

## Correção

Permitir que administradores contornem a checagem de reservados, mantendo o bloqueio para todos os demais usuários (e a checagem de formato/duplicidade para todos, inclusive admin).

1. Adicionar parâmetro opcional `bypassReserved` em `validateUsername` (`src/lib/profile-active.server.ts`).
2. Nas server functions que chamam `validateUsername` para trocar o `username` (procurar por `validateUsername(` em `src/lib/*.functions.ts` — provavelmente `profile.functions.ts`), consultar `public.has_role(userId, 'admin')` e passar `bypassReserved: true` quando for admin.
3. Nenhuma mudança de UI ou schema. A checagem de unicidade no banco (índice único) continua garantindo que ninguém colida.

Efeito: `caiorobbb@gmail.com` (admin) poderá salvar `monetisexy`; assinantes/criadores comuns continuam bloqueados.
