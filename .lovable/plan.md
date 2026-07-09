
## Fluxo

Após signup como creator, redirecionar para `/creator/onboarding` (dentro de `_authenticated`, protegido). Fluxo linear com stepper no topo (barra gradiente laranja→rosa adaptada ao tema roxo/fúcsia do Monetisex). Pode ser retomado depois via CTA no painel se pular. Só libera `/creator` quando todas as etapas obrigatórias forem concluídas (KYC pode ficar `pending` sem bloquear acesso ao painel, mas bloqueia publicar/receber).

Etapas: `redes-sociais` → `assinatura` → `documentos` → `documentos/verificando` (aguardo do resultado Stripe) → volta pra `/creator`.

## Telas

Todas seguem o mesmo shell: topbar com ← voltar + título centralizado + progress bar gradiente (`bg-gradient-to-r from-fuchsia-500 to-purple-500`), fundo escuro com gradiente radial (padrão do projeto), card central `rounded-3xl border-white/10 bg-white/5 backdrop-blur-md`, botão primário `bg-gradient-primary` (roxo→fúcsia) — traduzindo o laranja dos mockups pro tema do site.

**1. Redes sociais** (`/creator/onboarding/redes-sociais`)
Título "Conecte suas redes sociais". 3 inputs prefixados com ícone (Instagram, TikTok, X) mostrando `instagram.com/`, `tiktok.com/`, `x.com/` como prefixo estático + campo `seu @`. Validação: só handle (regex `^[a-zA-Z0-9._]{1,30}$`), opcional. Botões "Avançar" e "Pular por enquanto".

**2. Preços de assinatura** (`/creator/onboarding/assinatura`)
Título "Defina o valor de assinatura dos seus conteúdos" + subtítulo tranquilizador. Grid de 3 cards (Mensal, Trimestral, Semestral) mostrando o preço calculado em tempo real (`R$ 0,00` grande). Link "Simular ganhos com assinatura" (abre modal simples com cálculo: preço × assinantes − 20% taxa plataforma — mock). Formulário: input Mensal (R$, min 19,90 / max 200,00), inputs Desconto Trimestral (%) e Desconto Semestral (%), 0–90. Preços derivados recalculados ao vivo. Botão "Avançar".

**3. Verificação de documentos — intro** (`/creator/onboarding/documentos`)
Título "Verificação de documentos" + parágrafo "Faltam poucos passos para você se tornar um(a) creator Monetisex. Precisamos validar seus documentos — o processo é rápido e sigiloso, feito pela Stripe Identity." Botão "Iniciar verificação".

**4. Handoff Stripe Identity**
Ao clicar em "Iniciar verificação":
- chama server fn `createIdentityVerificationSession` (autenticada) → cria `VerificationSession` na Stripe com `type: 'document'`, `options.document.require_matching_selfie: true`, `options.document.require_live_capture: true`, `metadata: { user_id }`, `return_url: <origin>/creator/onboarding/documentos/verificando`.
- salva `stripe_verification_session_id` em `profiles` e marca `kyc_status = 'processing'`.
- redireciona o usuário pra `session.url` (fluxo hosted da Stripe — Stripe cuida de todas as sub-telas de consentimento, país, tipo doc, upload frente/verso, liveness/selfie, tudo aquilo dos screenshots do Sumsub, com UI da Stripe).

**5. Retorno "Tudo pronto"** (`/creator/onboarding/documentos/verificando`)
Título "Tudo pronto! Agora só esperar enquanto cuidamos do resto." Ilustração/grid de avatares gerada por IA (imagegen — mosaico de retratos estilizados, tema roxo). Texto explicando que a validação leva alguns minutos. Botão "Ir para o painel" → `/creator`. Faz polling (a cada 8s) numa server fn `getKycStatus` até virar `verified`/`requires_input`/`canceled` e atualiza banner (verde/amarelo/vermelho) sem forçar o usuário a ficar na página.

**6. Webhook Stripe** (`/api/public/webhooks/stripe-identity`)
Server route público que valida assinatura via `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`. Trata `identity.verification_session.verified`, `.requires_input`, `.canceled`, `.processing` — atualiza `profiles.kyc_status` e `kyc_verified_at` via `supabaseAdmin` (carregado dentro do handler).

## Persistência

Migration estendendo `profiles`:
- `instagram_handle text`, `tiktok_handle text`, `x_handle text`
- `price_monthly numeric(10,2)`, `discount_quarterly int default 0`, `discount_semiannual int default 0` (trimestral/semestral derivados; guardo mensal + descontos que é o que o form realmente edita)
- `kyc_status text default 'not_started'` (`not_started` | `processing` | `verified` | `requires_input` | `canceled`)
- `stripe_verification_session_id text`
- `kyc_verified_at timestamptz`
- `onboarding_completed_at timestamptz`
- CHECKs: `price_monthly` entre 19.90 e 200, descontos 0–90, `kyc_status` in enum.
- Reforçar policy `profiles_owner_update` (já existe) — nada muda de acesso.

## Roteamento pós-signup

Ajustar `homeForAccountType("creator")` pra continuar retornando `/creator`, mas `/creator` (loader) checa: se `account_type = creator` e (`price_monthly` null OU `kyc_status` in ('not_started','requires_input')) → `redirect({ to: '/creator/onboarding/<próxima-etapa-pendente>' })`. Assim retomar de onde parou funciona automaticamente.

## Secrets necessários

- `STRIPE_SECRET_KEY` (BYOK) — usuário cria conta Stripe, ativa Identity no dashboard, gera secret key. Adicionado via `add_secret` depois que o usuário confirmar que criou a conta.
- `STRIPE_WEBHOOK_SECRET` — gerado ao criar o endpoint de webhook no dashboard Stripe apontando pra `https://project--{id}.lovable.app/api/public/webhooks/stripe-identity`. Fluxo: crio a rota primeiro, mostro a URL, usuário cria webhook no Stripe, cola o signing secret via `add_secret`.

Enquanto os secrets não estiverem configurados, o botão "Iniciar verificação" mostra estado "Verificação temporariamente indisponível" — as etapas 1 e 2 funcionam normalmente.

## Detalhes técnicos

- `stripe` npm package (server-only, roda no Worker — a Stripe suporta edge/fetch runtime via `Stripe(secret, { httpClient: Stripe.createFetchHttpClient() })`).
- Server functions (`src/lib/onboarding.functions.ts`): `saveSocialLinks`, `saveSubscriptionPricing`, `createIdentityVerificationSession`, `getKycStatus` — todas com `.middleware([requireSupabaseAuth])`.
- Server route (`src/routes/api/public/webhooks/stripe-identity.ts`) — verificação de assinatura + `supabaseAdmin` dinamicamente importado.
- Componente `<OnboardingShell>` com stepper e progress bar reutilizado nas 4 telas.
- Ilustração da tela final: gerar 1 imagem com `imagegen` (mosaico de retratos, paleta roxo/fúcsia) e salvar em `src/assets/`.
- Reproveitar `AssinantePage` action-card styles pros cards de preço.

## Arquivos

```text
supabase/migrations/<timestamp>_creator_onboarding.sql   (nova — via tool)
src/lib/onboarding.functions.ts                          (novo — server fns)
src/routes/api/public/webhooks/stripe-identity.ts        (novo — webhook)
src/routes/_authenticated/creator.onboarding.tsx         (novo — layout com <Outlet/> + stepper)
src/routes/_authenticated/creator.onboarding.redes-sociais.tsx    (novo)
src/routes/_authenticated/creator.onboarding.assinatura.tsx       (novo)
src/routes/_authenticated/creator.onboarding.documentos.tsx       (novo)
src/routes/_authenticated/creator.onboarding.documentos.verificando.tsx (novo)
src/routes/_authenticated/creator.tsx                    (editar — loader redireciona pro onboarding pendente)
src/lib/auth.ts                                          (editar — routeAfterAuth manda creator novo pro onboarding)
src/components/onboarding/OnboardingShell.tsx            (novo — shell/stepper)
src/assets/onboarding-verificando.jpg                    (novo — gerado por IA)
```

## Fora de escopo

- Fluxo de "requires_input" completo (retomada com nova session — por enquanto botão "Tentar de novo" cria nova session).
- Simulador de ganhos com dados reais (fica mock).
- Envio de e-mail avisando resultado do KYC.
- Bloqueio de publicação enquanto KYC não estiver `verified` (o painel avisa, mas não bloqueia nada porque publicação ainda não existe).
