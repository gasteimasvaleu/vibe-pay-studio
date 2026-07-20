## Diagnóstico

A conta `sexandoapp@hotmail.com` (user `5f1467fb...`) está com `kyc_status = "processing"` e não existe nenhum row em `creator_profiles` para ela. A tela `/verificando` está polling corretamente — ela só sai quando o banco vira `verified`. Isso não aconteceu porque o webhook do Veriff nunca atualizou (ou o fallback GET `/decision` está falhando silenciosamente com apenas `console.warn`).

Além disso, você notou o problema estrutural: o onboarding "subscriber → creator" pula etapas e **não cria o `creator_profiles` (kind=paid)**. Depois do KYC aprovar, os gatilhos que preenchem `creator_profile_id` em publications/tips/subscriptions vão devolver `NULL` — e vão quebrar futuras vendas do perfil.

## Plano

### 1. Destravar sua conta agora
Migração pontual para o user `5f1467fb-4149-41a4-baea-9b7347444990`:
- `kyc_status = 'verified'`, `kyc_verified_at = now()`, `account_type = 'creator'`, `onboarding_completed_at = now()`.
- Criar o `creator_profiles` (kind='paid') faltante, copiando `username`, `display_name`, `avatar_url`, `cover_url`, `bio`, `price_monthly` do `profiles`.
- Atualizar `profiles.active_profile_id` para apontar para esse novo registro.

Depois disso, o próximo `getKycStatus` já leva a tela para `/aprovado`.

### 2. Garantir que "subscriber → creator" sempre crie o creator_profile
Criar/ajustar gatilho em `public.profiles`: quando `account_type` muda para `'creator'` (ou quando `kyc_status` vira `'verified'` no fluxo creator), inserir automaticamente o row correspondente em `creator_profiles` (kind='paid') se ainda não existir, e setar `active_profile_id`. Assim o webhook do Veriff resolve tudo em uma tacada.

### 3. Tornar o polling do KYC resiliente

Em `src/lib/onboarding.functions.ts` (`getKycStatus`):
- **Logar visivelmente** (com `console.error` incluindo status HTTP e body) quando o fallback ao Veriff `/decision` falha — hoje é `console.warn` mudo.
- **Consultar também** `/v1/sessions/{id}` como segundo fallback (sandbox às vezes retorna 404 no `/decision` mesmo com sessão aprovada).
- Ao virar `verified`, executar o mesmo trabalho do webhook: promover para creator + criar `creator_profiles` + `active_profile_id`.

Em `src/routes/_authenticated/creator.onboarding.documentos.verificando.tsx`:
- **Polling adaptativo**: 3s nos primeiros 60s, 8s depois.
- Reagendar também no estado `not_started` (hoje só reagenda em `processing`).
- Após 90s sem resolução, mostrar **botão "Já concluí no Veriff — verificar agora"** que dispara um `getKycStatus` na hora, mais um link **"Voltar ao painel — te avisamos quando aprovar"**.

### 4. Ferramenta admin para reprocessar KYC
Adicionar no `/admin/users` (na linha do usuário) um botão **"Reconsultar KYC"**:
- Server function `adminRefreshKyc(userId)` protegida por role admin.
- Faz o mesmo fallback do item 3 usando o `veriff_session_id` do usuário.
- Se necessário, permite promover manualmente para `creator` sem depender de migração.

Assim, esse tipo de caso não te obriga a esperar uma nova migração.

### 5. Checagem do webhook (fora do código)
Depois que o item 3 estiver publicado, o próximo KYC vai revelar via logs se o webhook chegou. Se não chegar, confirmamos no dashboard do Veriff se a URL configurada é exatamente:
`https://vibe-pay-studio.lovable.app/api/public/webhooks/veriff-decision`
(e não uma preview URL antiga).

## Arquivos afetados

- Migração Supabase: destravar conta + criar `creator_profiles` faltante + trigger de auto-criação em promoção para creator.
- `src/lib/onboarding.functions.ts`: fallback resiliente + criação de `creator_profiles` no `verified`.
- `src/routes/_authenticated/creator.onboarding.documentos.verificando.tsx`: polling adaptativo + botão manual.
- `src/lib/admin-dashboard.functions.ts` (+ `src/routes/_authenticated/admin.users.tsx`): `adminRefreshKyc`.
