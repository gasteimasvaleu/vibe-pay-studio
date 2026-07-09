# Trocar Stripe Identity → Veriff

Stripe Identity não atende o Brasil. Veriff cobre BR nativamente, tem SDK web hosted (redirect) e webhook com assinatura HMAC — modelo praticamente 1:1 com o que já está montado. Só o **provedor** muda; as telas, o schema e o fluxo de navegação continuam iguais.

## O que muda

1. **Schema (migration)** — renomear na tabela `profiles`:
   - `stripe_verification_session_id` → `veriff_session_id text`
   - `kyc_status` continua com os mesmos valores (`not_started/processing/verified/requires_input/canceled`), mapeados a partir dos status do Veriff (`created → processing`, `submitted → processing`, `approved → verified`, `declined/resubmission_requested → requires_input`, `expired/abandoned → canceled`).
   - (Não mexer em `kyc_verified_at` nem `onboarding_completed_at`.)

2. **Secrets** — trocar os do Stripe pelos do Veriff:
   - `VERIFF_API_KEY` (Public key da integração — usado no header `X-AUTH-CLIENT`)
   - `VERIFF_API_SECRET` (Private/shared secret — usado pra assinar payload de criação e validar HMAC do webhook `x-hmac-signature`)
   - Onde pegar: painel Veriff → Integrations → criar integração "Web Hosted" → copiar Public/Private key. Configurar Callback URL apontando pro webhook do projeto e URL de retorno (`/creator/onboarding/documentos/verificando`).

3. **Server function `startIdentityVerification`** (em `src/lib/onboarding.functions.ts`)
   - POST `https://stationapi.veriff.com/v1/sessions` com `{ verification: { callback: "<app>/creator/onboarding/documentos/verificando", person: { firstName, lastName }, vendorData: userId, lang: "pt-BR" } }`.
   - Assinar body com HMAC-SHA256 usando `VERIFF_API_SECRET` no header `x-hmac-signature`; header `x-auth-client: VERIFF_API_KEY`.
   - Salvar `session.id` em `profiles.veriff_session_id`, marcar `kyc_status = 'processing'`, devolver `session.url` (URL hosted do Veriff pra redirecionar).
   - Sem secrets → retorna `{ available: false }` (tela mostra "temporariamente indisponível", igual hoje).

4. **Webhook `POST /api/public/webhooks/veriff-decision`** (novo arquivo, remove `stripe-identity.ts`)
   - Ler body como texto **antes** de parsear (assinatura é sobre o raw body).
   - Validar `x-hmac-signature` com `createHmac('sha256', VERIFF_API_SECRET).update(rawBody).digest('hex')` em `timingSafeEqual`.
   - Ler `verification.id` (= `veriff_session_id`) + `verification.status`, mapear pro enum e atualizar `profiles` via `supabaseAdmin` (import dentro do handler). Setar `kyc_verified_at = now()` quando `verified`.
   - Retornar 200 sempre que a assinatura for válida (Veriff repete em 4xx/5xx).

5. **Telas** — sem mudança de layout. Só ajustes de cópia:
   - `documentos.tsx`: trocar menção a "Stripe" por "Veriff" no parágrafo intro ("Vamos verificar sua identidade com nosso parceiro Veriff...").
   - `documentos.verificando.tsx`: mesma tela, mesmo polling em `getKycStatus` (server fn continua igual, só lê `profiles.kyc_status`).

6. **Cleanup** — apagar `src/routes/api/public/webhooks/stripe-identity.ts`. Não instalar pacote Stripe (o `bun add stripe` da rodada anterior fica solto — remover do `package.json` na mesma rodada).

## Fora do escopo
- Fallback manual caso Veriff rejeite (fica na tela `requires_input` como hoje).
- Reagendar verificação automaticamente (usuário clica de novo em "Iniciar verificação" que cria uma sessão nova).
- Notificações por e-mail quando o webhook chegar.

## Ordem de execução
1. Migration (renomeia coluna).
2. Pedir `VERIFF_API_KEY` + `VERIFF_API_SECRET` (com instruções de onde criar no painel Veriff e qual Callback URL colar).
3. Reescrever `onboarding.functions.ts` (parte KYC) + criar webhook Veriff + apagar webhook Stripe + limpar dep `stripe`.
4. Ajustar cópia das 2 telas.