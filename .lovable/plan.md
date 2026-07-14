## Objetivo

Mostrar as assinaturas configuradas pelo criador (mensal + descontos trimestral/semestral) na página de perfil `/perfil/$username` quando outro usuário (criador ou assinante) acessa, no estilo do segundo screenshot: bloco "Assinaturas" com o plano mensal e, se houver descontos, um bloco "Promoções" (colapsável) com 3 e 6 meses.

## Estado atual

- `profiles` já tem os campos: `price_monthly` (numeric, em reais/mês), `discount_quarterly` (int %), `discount_semiannual` (int %).
- `/settings/subscription` (primeiro screenshot) hoje só mostra `toast.info("Em breve")` no Salvar — **não persiste nada**. Sem persistência, o perfil de outro criador continuaria sem dados para mostrar.
- `/perfil/$username` já carrega `price_monthly` no `beforeLoad`, mas não usa `discount_quarterly/semiannual` e o CTA atual é só o botão "Assinar por R$ X/mês".

Como o pedido é "as assinaturas configuradas … devem ser mostradas", precisamos (1) salvar de verdade em `/settings/subscription` e (2) renderizar o bloco no perfil.

## Mudanças

### 1. `src/routes/_authenticated/settings.subscription.tsx` — salvar de verdade

- Carregar valores iniciais do próprio perfil (`price_monthly`, `discount_quarterly`, `discount_semiannual`) via `beforeLoad` e usá-los como estado inicial.
- No `handleSave`: `update` em `profiles` (`price_monthly`, `discount_quarterly`, `discount_semiannual`) para `user_id = auth.uid()`. Toast de sucesso e voltar. Toast de erro em falha.
- Manter validações (mínimo/máximo/descontos 0-100).

### 2. `src/routes/_authenticated/perfil.$username.tsx` — expor descontos e renderizar bloco

- No `beforeLoad`, incluir `discount_quarterly, discount_semiannual` no `select` e propagar para `profile` do contexto (`discountQuarterly`, `discountSemiannual`).
- Novo componente `SubscriptionPlansCard` renderizado apenas quando `!isOwner && priceMonthly > 0`, posicionado no lugar do CTA atual "Assinar por…".
  - Cabeçalho "Assinaturas" + pílula gradiente (mesmo estilo do CTA atual, laranja→rosa da marca) com "1 mês" à esquerda e valor em BRL à direita.
  - Se `discount_quarterly > 0` ou `discount_semiannual > 0`, mostrar bloco "Promoções" (colapsável com chevron, aberto por default) com uma pílula para cada plano ativo:
    - "3 meses" — `price_monthly * 3 * (1 - discount_quarterly/100)`
    - "6 meses" — `price_monthly * 6 * (1 - discount_semiannual/100)`
  - Clique em qualquer pílula abre o `SubscribeDialog` já existente (por enquanto sem alterar o dialog: ele continua tratando como assinatura mensal). Passar o plano escolhido como estado local (`selectedPlan: 'monthly' | 'quarterly' | 'semiannual'`) para futura extensão; o dialog atual pode ignorar.

### 3. Estilo

- Reusar tokens semânticos existentes (`from-fuchsia-500 to-purple-600` para o CTA mensal, ou variação laranja se combinar com o restante do perfil). Nada de cores hardcoded fora do padrão do arquivo.

## Fora do escopo

- Alterar `SubscribeDialog` para efetivamente cobrar 3/6 meses com desconto — só sinalizar o plano; a cobrança segue mensal até pedido futuro.
- Migrations (as colunas já existem).
- Página `/settings/subscription` visual — só ligar Save à base.

## Validação

1. Logar como criador A, abrir `/settings/subscription`, definir mensal R$ 50, desconto trimestral 0%, desconto semestral 0% → salvar → recarregar mostra os mesmos valores.
2. Definir descontos > 0 e salvar.
3. Logar como criador B (ou assinante), abrir `/perfil/<username-de-A>` → ver bloco "Assinaturas" com "1 mês R$ 50,00" e, se houver descontos, "Promoções" com 3 e 6 meses calculados.
4. Sem descontos, o bloco "Promoções" não aparece.
5. Próprio dono (`isOwner`) não vê o bloco (mantém "Editar perfil").
