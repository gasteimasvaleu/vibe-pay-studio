## Objetivo

Deixar a aba **Alcance** exatamente como o screenshot, com dados reais:

1. Card grande do gráfico "N Visitantes" (linhas Visitantes + Usuários) — já existe, sem mudanças estruturais.
2. Card **Resumo** com 4 itens: **Visitantes**, **Assinaturas** (quantidade), **Assinaturas** (R$ faturamento), **Renovações**.
3. Tabela **Visitantes do perfil** com colunas **Visitantes / Usuários / Total** (remover coluna "Publicações").
4. Novo card **Principais países** com bandeira + nome do país + Visitantes / Usuários / Total, ordenado por Total desc.

## 1. Banco (migration)

Adicionar coluna de país às visitas para permitir o card "Principais países":

- `ALTER TABLE public.profile_views ADD COLUMN country text` (ISO-2, nullable — histórico fica `NULL`).
- Índice `idx_profile_views_profile_country ON profile_views(profile_id, country)`.

Sem novas policies (RLS existente permanece).

## 2. Backend

### `logProfileView` em `src/lib/stats.functions.ts`
- Ler o header `cf-ipcountry` via `getRequestHeader` (Cloudflare Workers seta esse header automaticamente). Fallback: `x-vercel-ip-country`. Se ausente → `null`.
- Passar `country` no `insert`.

### `getAlcance`
- Ao consultar `profile_views`, incluir `country` no `select`.
- Agregar `topCountries: { country: string | null; visits: number; users: number }[]` (top 10, users = únicos por `viewer_id`).
- Retornar também `subscriptionsCount`, `subscriptionsRevenueCents`, `renewalsCount` no período — reusar a mesma lógica de `getAssinantesStats` (query em `transactions` `kind='subscription'` + flag `isRenewal`) diretamente dentro do handler para não fazer round-trip extra.

## 3. UI — `src/routes/_authenticated/my-monetisex-stats.tsx` (`AlcancePanel`)

- **Resumo**: substituir os 4 `ResumoItem`s por:
  - `Users` "Visitantes" = `profileViews`
  - `UserPlus` "Assinaturas" = `subscriptionsCount`
  - `DollarSign` "Assinaturas" = `formatBRL(subscriptionsRevenueCents)`
  - `RefreshCw` "Renovações" = `renewalsCount`
- **Tabela "Visitantes do perfil"**: passar para 3 colunas (`Visitantes | Usuários | Total`), uma linha só ("Visitantes do perfil"), Total = Visitantes + Usuários? Não — no screenshot Total = 4 quando Visitantes=4 e Usuários=0, então **Total = Visitantes** (soma das duas colunas). Confirmado: `4 + 0 = 4`. Implementar assim.
- **Novo card "Principais países"** abaixo da tabela: header com colunas `País | Visitantes | Usuários | Total`, linhas iterando `topCountries`. Usar emoji-flag derivada do ISO-2 (`String.fromCodePoint(0x1F1E6 + (c.charCodeAt(0)-65))...`) com fallback "🌐 Desconhecido" quando `country` é `null`. Nome do país via `Intl.DisplayNames(['pt-BR'], { type: 'region' })`.
- Legendas do gráfico já estão em "Visitas / Usuários únicos" — renomear labels para **Visitantes** e **Usuários** para bater com o screenshot.

## Detalhes técnicos

- `cf-ipcountry` é preenchido pela Cloudflare em produção; em preview local pode vir vazio → linha "Desconhecido" agrega esses casos.
- Nenhum breaking change no schema atual; visitas existentes ficam agrupadas em "Desconhecido" até serem re-logadas.
