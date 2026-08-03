# Iniciar o onboarding de creator logo após a confirmação do e-mail

## Situação atual

Após confirmar o e-mail, o usuário sempre cai em `/feed`:

- `routeAfterAuth()` em `src/lib/auth.ts` navega fixo para `/feed` (usado no login por e-mail, Google e no fluxo "Já confirmei").
- `src/routes/auth.confirm.tsx` redireciona para `/feed` quando não há `next`.
- A única checagem de onboarding existe hoje no `beforeLoad` de `src/routes/_authenticated/dashboard.tsx`, por isso o onboarding só dispara quando o creator abre o painel.

## O que muda

Creator com cadastro incompleto (`account_type = 'creator'` e `onboarding_completed_at` vazio) vai direto para o próximo passo do onboarding assim que entra no app — logo após confirmar o e-mail ou fazer login. Assinantes e creators já completos continuam indo para o `/feed` normalmente.

## Implementação

1. Novo módulo `src/lib/onboarding-step.ts`
   - `resolveCreatorOnboardingStep()`: lê o perfil do usuário logado (`account_type`, `onboarding_completed_at`, `price_monthly`, `kyc_status`, redes sociais) e o `creator_profiles` pago, e devolve a rota do próximo passo ou `null` quando não há pendência.
   - Regras iguais às já usadas no dashboard: sem redes/preço → `/creator/onboarding/redes-sociais`; sem preço → `/creator/onboarding/assinatura`; KYC `not_started`/`requires_input` → `/creator/onboarding/documentos`; KYC `processing` → `/creator/onboarding/documentos/verificando`.

2. `src/lib/auth.ts`
   - `routeAfterAuth()` passa a consultar `resolveCreatorOnboardingStep()` e navega para o passo pendente; caindo em `/feed` quando não houver nenhum.

3. `src/routes/auth.confirm.tsx`
   - Quando não houver `next` explícito, usa o mesmo resolvedor no lugar do `/feed` fixo (a confirmação no mesmo navegador já cria sessão).

4. `src/routes/_authenticated/dashboard.tsx`
   - Reaproveita o helper no `beforeLoad`, removendo a duplicação da lógica de redirecionamento (comportamento inalterado).

## Detalhes técnicos

- Tudo no cliente com o `supabase` já existente; nenhuma mudança de schema, RLS ou server function.
- Confirmação feita em outro dispositivo continua indo para `/entrar?confirmado=true`; o redirecionamento acontece no login seguinte, via `routeAfterAuth()`.
- O passo do onboarding é sempre recalculado a partir do banco, então o usuário nunca é reenviado para uma etapa já concluída.
