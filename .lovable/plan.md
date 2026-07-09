## Promover assinante para creator

Fluxo: assinante clica em CTA no painel → percorre onboarding de creator normalmente → conta só vira `creator` quando o KYC for aprovado.

### 1. CTA no painel do assinante (`/assinante`)
- Adicionar card "Quer virar creator?" com botão "Começar agora" que navega para `/creator/onboarding/redes-sociais`.

### 2. Permitir assinante no onboarding de creator
As rotas `creator.onboarding.*` hoje só verificam autenticação (não bloqueiam por `account_type`). Manter como está — assinante consegue percorrer os passos e preencher `instagram_handle`, `price_monthly`, etc., no próprio `profiles` sem trocar o tipo ainda.

### 3. Guarda em `/creator` (painel)
Hoje `_authenticated/creator.tsx` redireciona para `/assinante` se `account_type !== "creator"`. Ajustar: se `account_type === "subscriber"` **mas** o onboarding de creator está em andamento (tem `price_monthly` ou handle social preenchido) e o KYC ainda não foi aprovado, redirecionar para o próximo passo do onboarding em vez de `/assinante`.

### 4. Promoção no webhook do Veriff
Em `src/routes/api/public/webhooks/veriff-decision.ts`, quando a decisão for `approved`:
- além de setar `kyc_status = 'verified'` e `kyc_verified_at`, também setar `account_type = 'creator'` e `onboarding_completed_at = now()` se ainda não estiver.

Assim, ao terminar KYC, a página `/creator/onboarding/documentos/aprovado` mostra o sucesso e o painel `/creator` passa a liberar acesso.

### 5. Detalhes de UX
- No painel do assinante, mostrar o CTA apenas quando `account_type === 'subscriber'` e `kyc_status !== 'verified'`.
- Caso o assinante já tenha iniciado onboarding (algum handle ou preço preenchido), o CTA vira "Continuar cadastro de creator" e leva ao passo pendente.

### Arquivos a alterar
- `src/routes/_authenticated/assinante.tsx` — novo card/CTA.
- `src/routes/_authenticated/creator.tsx` — ajustar guarda para assinantes em onboarding.
- `src/routes/api/public/webhooks/veriff-decision.ts` — promover para creator no `approved`.

Sem mudanças de schema — os campos `account_type`, `kyc_status`, `onboarding_completed_at` já existem em `profiles`.