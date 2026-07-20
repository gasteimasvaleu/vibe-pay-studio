## Objetivo

Permitir que uma conta **creator pago** tenha também um "perfil gratuito" vinculado e alterne entre os dois modos (creator ↔ free_creator/assinante), sem perder dados nem trocar de conta. O botão "Acessar perfil gratuito" no card do dashboard faz a troca.

## Modelo de dados

Manter **uma única linha em `public.profiles` por usuário** (o schema atual assume isso em muitos lugares). O modo de visualização vira uma preferência do próprio perfil:

Migração em `public.profiles`:
- `free_profile_enabled boolean not null default false` — indica que o creator ativou o modo gratuito.
- `active_view text not null default 'creator' check (active_view in ('creator','free'))` — qual "cara" o app está renderizando agora para esse usuário.
- (opcional, para diferenciar visualmente) `free_display_name text`, `free_avatar_url text` — se o creator quiser um nome/foto distintos no modo assinante. Sem valores, cai no perfil creator.

`account_type` continua `'creator'` — não sofre downgrade. O modo é apenas de visualização.

## Backend

`src/lib/onboarding.functions.ts`:
- Ajustar `createFreeCreatorProfile`:
  - Se `account_type === 'creator'` → em vez de lançar `already_creator`, gravar `free_profile_enabled = true`, `active_view = 'free'`, e salvar os campos opcionais (`free_display_name`, `free_avatar_url`) sem tocar em `username`, `account_type` ou `avatar_url` do perfil creator.
  - Se `account_type === 'subscriber'` → comportamento atual (vira `free_creator`).
  - Se já é `free_creator` → apenas atualiza dados (comportamento atual).

Nova server function `setActiveProfileView({ view: 'creator' | 'free' })` em `src/lib/account.functions.ts`:
- Atualiza `active_view` no perfil.
- Regra: só aceita `'free'` se `account_type === 'free_creator'` OU `free_profile_enabled === true`.
- Retorna `{ view }`.

Expor `active_view` e `free_profile_enabled` nas queries de perfil já existentes (dashboard, top bar, bottom nav).

## Frontend

**Dashboard — card do perfil creator** (`src/components/dashboard/CreatorDashboard.tsx` + `ProfileHeaderCard.tsx`):
- Renderizar a barra "Acessar perfil gratuito" (conforme o screenshot) dentro do card quando `account_type === 'creator'`.
- Se `free_profile_enabled === false` → clique leva a `/criar-perfil-gratuito` (formulário existente, mas agora não faz downgrade — apenas ativa o modo).
- Se `free_profile_enabled === true` → clique chama `setActiveProfileView({ view: 'free' })`, invalida queries de sessão e navega para `/feed`.

**Modo gratuito ativo** (`active_view === 'free'` num creator):
- `BottomNav` e demais gates que decidem UI por `isCreatorLike` passam a considerar `active_view`: se `'free'`, tratam como assinante (menus, dashboard, etc.).
- No `SubscriberDashboard` (ou no header do modo free), incluir botão simétrico "Voltar ao perfil creator" que chama `setActiveProfileView({ view: 'creator' })`.

**`/criar-perfil-gratuito`** (`src/routes/_authenticated/criar-perfil-gratuito.tsx`):
- Detectar `account_type`:
  - `creator` → texto/CTA muda para "Ativar perfil gratuito vinculado" (deixa claro que não substitui o creator). Campos de handle/@ ficam ocultos (username permanece o do creator). Confirmar chama `createFreeCreatorProfile` no novo modo, seta `active_view='free'` e navega para `/feed`.
  - `subscriber` → fluxo atual (cria free_creator do zero).
  - `free_creator` → edição.
- Remover o toast "Sua conta já é creator pago" (não é mais um erro).

## Rotas públicas

Nenhuma mudança. `/perfil/$username` continua resolvendo pelo `username` do creator; o modo gratuito é uma **experiência interna do próprio usuário logado**, não um segundo perfil público. Isso evita duplicação de identidade e problemas de SEO/monetização.

## Arquivos afetados

- Migração (adicionar colunas em `profiles`).
- `src/lib/onboarding.functions.ts` — comportamento dual em `createFreeCreatorProfile`.
- `src/lib/account.functions.ts` — nova `setActiveProfileView`.
- `src/components/dashboard/CreatorDashboard.tsx`, `SubscriberDashboard.tsx`, `ProfileHeaderCard.tsx` — botão de troca.
- `src/components/site/BottomNav.tsx`, `AppTopBar.tsx` — considerar `active_view`.
- `src/routes/_authenticated/criar-perfil-gratuito.tsx` — ramo "creator ativa modo free".
- `src/lib/auth.ts` — `isCreatorLike` pode ganhar variante `getEffectiveAccountView(profile)` para centralizar a regra.
