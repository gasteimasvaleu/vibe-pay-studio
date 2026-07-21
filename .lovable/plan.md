## Diagnóstico (confirmado via logs)

O polling do frontend está funcionando, mas o Veriff está devolvendo `{"status":"success","verification":null}` no endpoint `/v1/sessions/{id}/decision` — ou seja, **a decisão em nível de sessão ainda não foi emitida**, mesmo com Attempt #1 marcado como APPROVED no painel. O fallback `/v1/sessions/{id}` retorna 404 (endpoint inválido nessa API). Resultado: a página fica presa em "processing".

Nos webhooks recebidos (screenshot) só aparecem eventos de tipo **Event** (`started`, `submitted`). O **Decision webhook** (o único que dispara `approved`) não foi entregue — ou porque a URL de Decision webhook não está configurada no painel Veriff, ou porque a sessão ainda não foi finalizada no lado deles.

## O que corrigir

### 1. Consultar o endpoint de attempts (fix principal, código)

Adicionar em `src/lib/onboarding.functions.ts` → `fetchVeriffStatus` um terceiro fallback antes de desistir:

```
GET https://stationapi.veriff.com/v1/sessions/{sessionId}/attempts
```

Cada item tem `status` (`approved`, `declined`, `resubmission_requested`, `expired`, `abandoned`, `submitted`, `started`). Pegar o attempt mais recente (por `updatedAt`/`createdAt`) e mapear via `veriffStatusMap` já existente. Isso destrava contas onde o admin aprovou um attempt manualmente antes da decisão de sessão ser publicada.

Trocar também o fallback quebrado `/v1/sessions/{id}` (que retorna 404) por esse endpoint de attempts — remove o log de erro em loop.

### 2. Ação manual no painel Veriff (fora do código)

Confirmar em Veriff → Integrations → Webhooks que existe uma URL cadastrada para o tipo **Decision** (não só **Event**), apontando para:

```
https://monetisexy.com/api/public/webhooks/veriff-decision
```

Sem isso, mesmo quando a decisão sair, o app só descobre por polling.

### 3. Destravar a conta atual

Após o deploy, o próprio polling da página vai encontrar o attempt `approved` e promover a conta. Se quiser destravar imediatamente sem esperar, uso `adminRefreshKyc` (já existe) no dashboard admin com o `userId` afetado — ele vai passar pelo mesmo caminho corrigido.

## Arquivos afetados

- `src/lib/onboarding.functions.ts` — adicionar consulta a `/attempts`, remover fallback quebrado `/v1/sessions/{id}`.

Sem mudanças de schema, sem mudanças de UI.