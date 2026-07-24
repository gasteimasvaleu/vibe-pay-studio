
## Situação atual (confirmado no código)

- `perfil.$username.tsx` já busca a assinatura ativa (`activeSub` em L126–134) e expõe `isSubscribed` no componente, mas o card **"Assinaturas"** (L845–853, `SubscriptionPlansCard`) é renderizado sempre que `!isOwner && monthlyPrice > 0`, ignorando `isSubscribed`. Por isso o usuário assinante continua vendo "1 mês / 3 meses / 6 meses" como se não tivesse plano.
- O loader não retorna qual plano está ativo nem `current_period_end`, só um boolean.
- `subscribeToCreator` sempre `INSERT` em `subscriptions` com `current_period_end = agora + N dias`, sem somar tempo remanescente da assinatura anterior.

## O que vou construir

### 1. UX no perfil (visual conforme screenshot, adaptado ao caso "assinado")

Quando `isSubscribed`:

- Substituir o bloco `SubscriptionPlansCard` por um `ActiveSubscriptionCard` com:
  - Badge "Assinatura ativa" + nome do plano atual (1 mês / 3 meses / 6 meses).
  - Linha "Válida até dd/mm/aaaa" e "Renova automaticamente" / "Renovação cancelada — acesso até …" conforme `auto_renew`.
  - Botão secundário "Gerenciar assinatura" → link para `/subscriptions`.
  - Sub-seção "Trocar de plano" listando apenas planos **maiores** que o atual (upgrade), com selo "+X dias somados ao seu acesso atual" calculado a partir de `current_period_end`. Planos iguais/menores ficam ocultos (downgrade não faz sentido enquanto há período pago).
- Se `auto_renew=false` e o período expirou, cair de volta no card de planos normal (não é mais assinante).
- Manter a estética atual dos pills roxos; só muda o topo (estado ativo) e a lista fica reduzida a upgrades.

### 2. Dados que o loader passa a devolver

Estender a query de `activeSub` para trazer `id, plan, price_cents_paid, current_period_end, auto_renew, started_at` e propagar para o componente como `activeSubscription`.

### 3. Regra de troca de plano (backend)

Alterar `subscribeToCreator` em `src/lib/monetization.functions.ts`:

- Antes de inserir, buscar assinatura ativa do mesmo `subscriber_id` + `creator_profile_id` com `status='active'` e `current_period_end > now()`.
- Se existir:
  - Se o novo plano é **igual ou menor** em duração → erro amigável ("Você já possui um plano igual ou maior ativo").
  - Se é **maior** (upgrade):
    - Calcular `remainingMs = current_period_end - now()`.
    - Novo `current_period_end = now() + PLAN_DAYS[novoPlano] + remainingMs` (soma o restante).
    - Cancelar a assinatura Asaas antiga (`deleteAsaasSubscription`) se houver `asaas_subscription_id`, para evitar cobrança dupla.
    - Marcar a assinatura antiga como `status='superseded'`, `auto_renew=false`, `cancelled_at=now()`.
    - Criar nova assinatura `pending` com o `current_period_end` estendido; o fluxo de pagamento (PIX/cartão) segue igual, e o webhook a ativa.
- Sem assinatura ativa → comportamento atual.

Isso responde diretamente à pergunta: **sim, no upgrade o tempo restante do plano atual é somado ao novo período**.

### 4. Ajustes secundários

- `SubscribeDialog` recebe prop opcional `mode: "new" | "upgrade"` e, em upgrade, mostra label "Fazer upgrade — soma X dias ao seu acesso" no CTA.
- `listMySubscriptions` já ordena por `started_at`; nada a mudar.
- Sem migração de banco — reutilizando colunas existentes; apenas um novo valor lógico `'superseded'` no campo `status` (texto livre; políticas RLS atuais não restringem valores).

## Detalhes técnicos

- Arquivos a editar: `src/routes/_authenticated/perfil.$username.tsx` (loader + render), `src/lib/monetization.functions.ts` (`subscribeToCreator`), `src/components/payments/SubscribeDialog.tsx` (label/estado upgrade), e um novo `ActiveSubscriptionCard` inline no perfil (ou como componente separado se preferir).
- Nada muda no webhook Asaas: a nova subscription entra pelo mesmo caminho de checkout já existente.
- Não altero nenhum comportamento para não-assinantes nem para o dono do perfil.

## Fora de escopo

- Downgrade / troca para plano menor (não faz sentido enquanto há tempo pago; posso adicionar depois se quiser).
- Reembolso proporcional do plano antigo (a lógica é somar tempo, não reembolsar).
