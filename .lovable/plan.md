
## Diagnóstico

Duas coisas independentes deram errado:

1. **O webhook do Veriff está batendo na URL errada.** No painel do Veriff a URL de "Decision webhook" está configurada como `https://vibe-pay-studio.lovable.app/creator/onboarding/documentos/verificando` — que é uma página React, não uma rota de API. Por isso o Veriff recebe `500 Internal Server Error` mesmo com a verificação `Approved`. O endpoint correto que já existe no projeto é `/api/public/webhooks/veriff-decision`.

2. **A página `/documentos/verificando` só descobre a aprovação via webhook.** Como o webhook nunca chega no endpoint certo, o `profiles.kyc_status` fica em `processing` para sempre, o polling nunca vê `verified` e o usuário nunca é redirecionado para `/creator/onboarding/documentos/aprovado` (e daí para o feed). Além disso o redirect do Veriff está mandando para a home (que sem sessão vira `/entrar`) em vez de voltar para `/verificando`.

## Plano

### 1. Ação manual no painel do Veriff (fora do código)
Você precisa trocar, no painel do Veriff → Integrations → Webhooks:
- **Decision webhook URL** para: `https://vibe-pay-studio.lovable.app/api/public/webhooks/veriff-decision`
- (Opcional, mesmo endpoint) **Event webhook URL** para a mesma URL.

Sem isso o Veriff continua batendo em `/creator/onboarding/documentos/verificando` e recebendo 500. Não há como definir esse URL pela API de sessão — é config de integração.

### 2. Fallback server-side: consultar decisão do Veriff no polling
Mesmo com o webhook configurado, para não depender só dele adiciono um fallback em `src/lib/onboarding.functions.ts`:

- No `getKycStatus`, se o status atual for `processing`/`not_started` e existir `veriff_session_id`, chamar `GET https://stationapi.veriff.com/v1/sessions/{id}/decision` com os headers HMAC do Veriff.
- Mapear a resposta (`verification.status`: `approved` → `verified`, `resubmission_requested`/`declined` → `requires_input`, `expired`/`abandoned` → `canceled`, resto → `processing`).
- Se mudou para `verified`, atualizar `profiles` com `kyc_status='verified'`, `kyc_verified_at=now()`, `account_type='creator'`, `onboarding_completed_at=now()` (mesmo shape do webhook) e retornar o novo status.
- Se der erro/timeout na chamada ao Veriff, apenas devolver o status atual do banco (sem quebrar o polling).

Assim, mesmo que o webhook falhe, o polling de 8s da tela `/verificando` detecta a aprovação sozinho e o `useEffect` já existente chama `completeOnboarding()` + `navigate({ to: "/creator/onboarding/documentos/aprovado" })`.

### 3. Corrigir o `callback` que o Veriff usa para redirecionar o usuário
Em `saveSocialLinks`/`createIdentityVerificationSession` (`src/lib/onboarding.functions.ts`), o `verification.callback` está sendo definido como `data.return_url`, e no cliente `return_url` é `window.location.origin` — por isso ao terminar o Veriff joga o usuário em `/` (que, sem sessão ativa naquele contexto, vira `/entrar`).

- Passar do cliente um `return_url` absoluto apontando para `/creator/onboarding/documentos/verificando` (ex.: `${window.location.origin}/creator/onboarding/documentos/verificando`).
- Nenhuma mudança na assinatura da server function é necessária além de aceitar essa URL.

### 4. Validação
- Refresh na tela `/creator/onboarding/documentos/verificando` do usuário atual (session `98d3f08c-...`, já `Approved` no Veriff): o polling deve, na próxima chamada, cair no fallback do item 2, marcar `verified` e redirecionar para `/aprovado`.
- Testar novo fluxo end-to-end depois que você atualizar a URL do webhook no painel do Veriff: verificação → volta para `/verificando` → loader roxo → `/aprovado` → feed.
- Conferir no painel do Veriff que novos "Decision webhooks" saem com status `200` para `/api/public/webhooks/veriff-decision`.

## Arquivos a alterar
- `src/lib/onboarding.functions.ts` — adicionar fallback via API do Veriff no `getKycStatus`, garantir atualização do profile igual ao webhook.
- `src/routes/_authenticated/creator.onboarding.documentos.index.tsx` — passar `return_url` apontando para `/creator/onboarding/documentos/verificando`.

## Fora do escopo
- Não vou mexer no webhook `/api/public/webhooks/veriff-decision`, ele já está correto.
- Não vou alterar a tela `verificando.tsx` — o polling e a navegação já estão ok, só faltava o status virar `verified`.
