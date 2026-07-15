## Objetivo

Mostrar a oferta ativa do criador na sua página de perfil (`/perfil/$username`), dentro do card do perfil, logo abaixo da bio/social e acima da seção "Assinaturas", exatamente como no screenshot.

## Escopo

Só a página `/perfil/$username`. Sem alterar o `/promotion` (criação), o `/promotions` (gestão) ou o `SubscribeDialog`.

## Comportamento

- Exibir apenas quando **não é o dono** do perfil (`!isOwner`) e existe uma promoção ativa com vaga disponível.
- Se o viewer já é assinante ativo, também esconder (não faz sentido oferecer promo).
- Clicar no botão "Assinar agora R$ X,XX" abre o `SubscribeDialog` existente. A cobrança promocional já é aplicada automaticamente no server para o plano mensal (mudança anterior).

## Implementação

### 1. Loader (`src/routes/_authenticated/perfil.$username.tsx`)

Adicionar uma consulta em paralelo às existentes:

```ts
supabase
  .from("promotions")
  .select("id, name, promo_price, monthly_price_snapshot, discount_pct, ends_at, max_subscriptions, subscriptions_used")
  .eq("creator_id", profile.user_id)
  .eq("status", "active")
  .lte("starts_at", nowIso)
  .gt("ends_at", nowIso)
  .order("promo_price", { ascending: true })
  .limit(1)
  .maybeSingle()
```

RLS já permite (`Authenticated can view active promotions`). Retornar `promotion` no `loader` result (ou `null`), filtrando fora quando `subscriptions_used >= max_subscriptions`.

### 2. Novo componente `SubscriptionOfferCard` (dentro do mesmo arquivo)

Props: `promotion` (dados acima), `avatarInitial`, `onSubscribe`, `format` (Intl brl).

Estrutura visual replicando o screenshot:

- Container: `rounded-3xl border border-primary/30 bg-primary/[0.03] p-5 md:p-6`
- Header: ícone Sparkles (lucide) em laranja + título "Oferta de assinatura" (font-bold).
- Linha de countdown: `Termina em Xd, Yh Zm Ws` — hook `useCountdown(endsAt)` com `setInterval(1000)` e cleanup, formatando dias/horas/minutos/segundos; some quando chega a zero (nesse caso não renderizar o card).
- Linha do nome: avatar circular pequeno à esquerda + campo estilizado (não editável — usar `<div>` com aparência de input arredondado) mostrando `promotion.name`.
- Pill "Economize N%": pequeno badge verde arredondado, offset acima do CTA.
- CTA gradient: botão largura total, altura ~56px, `bg-gradient-to-r from-orange-400 via-orange-300 to-orange-200` (ou usar `bg-gradient-primary` do design system se existir laranja), texto preto bold: `Assinar agora {format(promo_price)}`.
- Abaixo à direita: `Preço original` + valor com `line-through text-muted-foreground`.

Todas as cores por tokens semânticos (nada hardcoded); usar `text-primary`/`bg-primary/10` para o pill quando o design system permitir e um `--gradient-offer` novo em `src/styles.css` para o CTA se necessário.

### 3. Placement

No JSX (`perfil.$username.tsx`), inserir **antes** do bloco `<SubscriptionPlansCard>` (linha ~640):

```tsx
{!isOwner && promotion && !isSubscribed && (
  <SubscriptionOfferCard
    promotion={promotion}
    avatarInitial={profile.username.slice(0,1).toUpperCase()}
    onSubscribe={() => setSubscribeOpen(true)}
    format={(v) => brl.format(v)}
  />
)}
```

## Fora de escopo

- Owner ver a própria oferta no seu perfil (ele já usa `/promotions`).
- Aplicar promo em planos trimestral/semestral (mantém regra atual: promo só para mensal).
- Atualização em tempo real (Realtime) do countdown de vagas.
- Novo dialog dedicado; reaproveita o `SubscribeDialog` existente.
