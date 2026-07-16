## Objetivo

Substituir o mock `SESSIONS` na seção "Seus acessos" da página `/settings/security-menu` pelos acessos reais do usuário, usando o mesmo backend já criado para `/settings/device-management`.

## Mudanças

**`src/routes/_authenticated/settings.security-menu.tsx`**
- Adicionar `loader: () => listMySessions()` importado de `@/lib/sessions.functions`.
- Ler os dados via `Route.useLoaderData()` e mostrar até 2 sessões mais recentes (priorizando a atual + a próxima mais recente).
- Remover o array mock `SESSIONS` e o tipo local `Session`.
- Reaproveitar a lógica de `parseUA` (browser/OS) e `formatDate` já usadas em `settings.device-management.index.tsx` — extrair para um helper compartilhado `src/lib/session-format.ts` para evitar duplicação, e importar nos dois arquivos.
- Card real exibe: ícone conforme tipo (mobile/tablet/desktop), `Browser · OS`, data do último acesso (`refreshedAt`), IP (ou "IP indisponível"), e badge "Atual" quando `isCurrent`.
- Remover o item "Renomear" do dropdown (Supabase Auth não guarda apelido). Manter "Remover acesso" chamando `revokeSession` com `AlertDialog` de confirmação — desabilitado/oculto para a sessão atual (igual à página completa).
- Após revogar, chamar `router.invalidate()` para recarregar a lista.
- Se não houver nenhuma sessão além da atual, mostrar apenas a atual. Se a lista estiver vazia, mostrar mensagem discreta "Nenhum acesso ativo".
- Manter o link "Ver todos acessos" apontando para `/settings/device-management`.

**`src/lib/session-format.ts`** (novo helper)
- Exportar `parseUA(ua)` e `formatDate(iso)` extraídos de `settings.device-management.index.tsx`.

**`src/routes/_authenticated/settings.device-management.index.tsx`**
- Trocar as definições locais de `parseUA`/`formatDate` pelo import do helper compartilhado (sem alteração de comportamento).

## Fora do escopo
- Sem migrations, sem novos secrets, sem geolocalização por IP.
- Sem alteração de layout visual dos outros itens do menu de segurança.
