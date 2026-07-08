
## Objetivo
Diferenciar `subscriber` vs `creator` no banco e no fluxo do app.

## 1. Banco (SQL para você rodar no SQL Editor)

- Criar enum `public.app_account_type` com valores `('subscriber','creator')`.
- Converter `public.profiles.account_type` de `text` para o enum, mantendo default `'subscriber'`.
  - `USING account_type::public.app_account_type` (linhas atuais já são 'subscriber').
- Atualizar `public.handle_new_user()` para castear o metadata em `app_account_type` com fallback `'subscriber'`.
- `types.ts` do Supabase será regenerado automaticamente após a migração.

Observação: só toca `profiles`. `user_roles` (admin/moderator) continua separado — é outro conceito.

## 2. Cadastro (front)

- `src/routes/cadastro.tsx` já tem as abas "Seja assinante / Seja creator" e envia `account_type` no metadata — mantém.
- Ajustar `src/lib/auth.ts`:
  - Tipar `AccountType` a partir do enum gerado (`Database["public"]["Enums"]["app_account_type"]`).
  - Após signup/login bem-sucedido, ler `profiles.account_type` e redirecionar:
    - `creator` → `/creator`
    - `subscriber` → `/feed`
- `src/routes/entrar.tsx`: usar o mesmo redirect pós-login (ler perfil e navegar).

## 3. Áreas protegidas por tipo

Criar layout autenticado gerenciado + duas rotas placeholder simples (só pra validar o fluxo; conteúdo real vem depois):

```
src/routes/_authenticated/route.tsx     (gate ssr:false → /entrar)
src/routes/_authenticated/creator.tsx   (painel do creator — placeholder)
src/routes/_authenticated/feed.tsx      (feed do assinante — placeholder)
```

Cada uma checa `profiles.account_type` e, se o tipo não bater, redireciona para a área correta (evita creator caindo no /feed e vice-versa).

## 4. Bug lateral (corrigir junto)
Runtime error atual `ReferenceError: localStorage is not defined` no SSR — o `supabase` client já tem guard `typeof window !== 'undefined'`, mas algum caminho lê sessão no server. Vou tratar durante a implementação (provavelmente `ensureCurrentUserProfile` chamado em contexto SSR ou getSession em loader) — sem mudar comportamento visível.

## Detalhes técnicos (para referência)

```sql
create type public.app_account_type as enum ('subscriber','creator');

alter table public.profiles
  alter column account_type drop default,
  alter column account_type type public.app_account_type
    using account_type::public.app_account_type,
  alter column account_type set default 'subscriber'::public.app_account_type;

-- handle_new_user(): coalesce(new.raw_user_meta_data->>'account_type','subscriber')::public.app_account_type
```

Redirect helper (novo em `src/lib/auth.ts`):

```ts
export async function routeAfterAuth(navigate) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return navigate({ to: "/entrar" });
  const { data: p } = await supabase.from("profiles")
    .select("account_type").eq("user_id", u.user.id).maybeSingle();
  navigate({ to: p?.account_type === "creator" ? "/creator" : "/feed" });
}
```

## Entregáveis
1. Migração SQL (via ferramenta de migration — você aprova/roda).
2. Edits em `src/lib/auth.ts`, `src/routes/cadastro.tsx`, `src/routes/entrar.tsx`.
3. Novos arquivos: `_authenticated/route.tsx`, `_authenticated/creator.tsx`, `_authenticated/feed.tsx`.
4. Fix silencioso do `localStorage is not defined`.
