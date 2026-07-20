## Objetivo
Permitir que o creator (modo vinculado) escolha um **@username separado** para o perfil gratuito, para que outros usuários possam visitá-lo por uma URL própria (`monetisexy.com/<free_username>`), sem depender do @ do perfil pago.

## Mudanças

### 1. Banco de dados (migração)
- Adicionar coluna `free_username text` em `public.profiles`.
- Índice único parcial: `UNIQUE (free_username) WHERE free_username IS NOT NULL`.
- Constraint garantindo que `free_username` não colida com nenhum `username` existente (validação feita na função de servidor; índice único cobre colisões entre `free_username`s).

### 2. Backend — `src/lib/onboarding.functions.ts`
No ramo "creator já pago" de `createFreeCreatorProfile`:
- Passar a exigir `handle` (mesma sanitização/validação atual: 3–20 chars, `[a-z0-9_]`, sem começar com `_`).
- Verificar que o handle não existe em `username` **nem** em `free_username` de outro usuário.
- Gravar em `free_username`, junto com `free_profile_enabled=true`, `active_view='free'`, e os campos `free_display_name` / `free_avatar_url` já implementados.
- Ao trocar o handle depois (re-submit), permitir atualização se ainda estiver livre.

### 3. Frontend — `/criar-perfil-gratuito`
- Reexibir o input de @ (com prefixo bloqueado `monetisexy.com/`) também quando `account_type === 'creator'`.
- Pré-preencher com o `free_username` atual, se já existir.
- Enviar o handle no submit (removendo a lógica que o omitia para creators).

### 4. Resolução da URL pública — `src/routes/_authenticated/profile.$username.tsx`
- `fetchProfileByUsername`: buscar por `username = :handle OR free_username = :handle`.
- Detectar qual coluna casou:
  - Se casou por `free_username` → retornar a "visão gratuita": `displayName = free_display_name ?? username`, `avatarUrl = free_avatar_url`, `accountType` tratado como assinante/free (sem CTAs de assinar, sem conteúdo pago), preservando o `user_id` do dono.
  - Se casou por `username` → comportamento atual (perfil creator).
- Ajustar `head()` para usar o handle correto no título.

### 5. Dashboard / barra de troca
- O botão "Acessar perfil gratuito" segue igual; nenhuma alteração de fluxo além de o link público do perfil gratuito agora usar `free_username`.

## Fora do escopo
- Não alterar `account_type` nem o @ do perfil pago.
- Não migrar dados existentes: creators que já ativaram o modo vinculado antes desta mudança verão o input vazio e precisarão escolher um handle na próxima visita a `/criar-perfil-gratuito` para que a URL pública funcione.
