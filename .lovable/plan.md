# Fazer todos os toggles de /settings/privacy-options funcionarem

Sete toggles hoje persistem no banco; três não têm efeito e dois têm efeito parcial. Este plano fecha as lacunas sem remover nada da UI.

## 1. `restrict_search_br` / `restrict_search_country` — filtro por país (geo-IP)

**Hoje:** ambos se comportam como o global (comentário TODO em `search.tsx`).

**Fazer:**
- Nova server function `resolveViewerCountry()` (`src/lib/geo.functions.ts`): lê `cf-ipcountry` via `getRequestHeader` (mesmo mecanismo já em `stats.functions.ts`). Retorna `{ country: string | null }`.
- Adicionar coluna `profiles.country` (2 letras ISO) — preenchida no cadastro/onboarding a partir de `cf-ipcountry`. Migração cria a coluna nullable e um backfill best-effort a partir do último `profile_views.country` do próprio dono.
- Em `src/routes/_authenticated/search.tsx` (loader):
  - Chamar `resolveViewerCountry()` no início.
  - `restrict_search_br`: filtrar `restrict_search_br.eq.false` **apenas** quando viewer country = `"BR"`; caso contrário, ignorar a flag.
  - `restrict_search_country`: filtrar `restrict_search_country.eq.false OR country != <viewer_country>` — ou seja, esconder apenas quando viewer_country == owner_country.
  - Sempre expor o próprio perfil ao viewer (já feito hoje).
- Se `cf-ipcountry` ausente (dev/local): aplicar comportamento equivalente ao global (fallback conservador, hoje já é assim).

## 2. `show_followers` — exibir contagem de seguidores no perfil

**Hoje:** contador não é mostrado, toggle sem efeito.

**Fazer:**
- Estender `getProfileByUsername` (arquivo do perfil público) para retornar `followers_count: number | null`:
  - `count` sobre `public.follows` where `following_user_id = <profile.user_id>`.
  - Se `profile.show_followers === false` **e** viewer != dono do perfil → retornar `null`.
- Em `src/routes/_authenticated/perfil.$username.tsx`, renderizar linha de stats: `"{followers_count} seguidores"` quando não-null; ocultar quando null. Colocar junto ao bloco de stats existente (avatar/cover/stats section, ~linha 582).
- Dono sempre vê o número (para poder decidir se quer ocultar).

## 3. `restrict_mentions` — já funcional; validar edge case

**Hoje:** honrado no lookup `@mention` de `search.tsx`.

**Fazer:** revisar o publicador para garantir que a resolução de `@usuario` no `PublisherComposer` também passe pelo mesmo endpoint filtrado (o autocomplete). Se já usa `search.tsx`/`searchMentions`, nada a alterar; se não, apontar para o mesmo filtro. Verificação sem mudança se já estiver correto.

## 4. `restrict_friendships` — remover botão "Adicionar amigo" quando ativo

**Hoje:** botão "Adicionar amigo" no menu do perfil só dispara um toast; toggle sem efeito.

**Fazer (escopo mínimo, sem construir sistema de amizades):**
- Em `perfil.$username.tsx`: quando `profile.restrict_friendships === true` e viewer != dono, **ocultar** o item "Adicionar amigo" no popover.
- Descrição do toggle continua coerente (perfil não aparece como amigo).
- Registrar TODO: quando um sistema real de amizades for construído, o mesmo flag governará a listagem `friends_of(user_id)`.

## 5. `emails_enabled` — já funcional

Verificado: `sendTransactionalEmail` chama RPC `can_send_email` que respeita `profiles.emails_enabled`. Nada a fazer.

## Ordem de execução

1. Migração: adicionar `profiles.country text` + backfill.
2. `src/lib/geo.functions.ts` (nova).
3. Atualizar `src/routes/_authenticated/search.tsx` loader com país do viewer + lógica dos dois filtros.
4. Estender fetcher do perfil para expor `followers_count` respeitando `show_followers`.
5. Ajustes de UI em `perfil.$username.tsx` (contador + ocultar "Adicionar amigo").
6. Preencher `profiles.country` no fluxo de cadastro/onboarding a partir de `cf-ipcountry` (server fn de criação/atualização de perfil já existente).

Nenhuma tela nova; nenhuma dependência externa nova (Cloudflare já entrega `cf-ipcountry`). Resend/gateway já configurado para e-mails.
