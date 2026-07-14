## Objetivo
Remover o link "Ver perfil →" do card de identidade no dashboard quando o usuário for um assinante puro — ou seja, conta atual do tipo `subscriber` e que nunca iniciou o onboarding de creator.

## Alterações

### 1. `src/components/dashboard/ProfileHeaderCard.tsx`
- Adicionar prop opcional `showProfileLink?: boolean` (default `true`).
- Renderizar o `<Link to="/perfil/$username">` apenas quando `showProfileLink` for `true`.

### 2. `src/components/dashboard/DashboardShell.tsx`
- Receber e repassar a prop `showProfileLink` para `<ProfileHeaderCard />`.

### 3. `src/components/dashboard/SubscriberDashboard.tsx`
- Passar `showProfileLink={creatorOnboardingStarted}` para `<DashboardShell />`.
- Assim, assinantes que clicaram em "Virar creator" ou preencheram algum passo do onboarding continuam vendo o link; assinantes puros não veem.

### 4. `src/components/dashboard/CreatorDashboard.tsx`
- Nenhuma mudança necessária: creators continuam vendo o link por padrão.

## Critério de esconder
```
account_type === "subscriber" && !creatorOnboardingStarted
```

O dashboard já calcula `creatorOnboardingStarted` a partir das redes sociais, preço mensal e status KYC, então nenhuma mudança de banco de dados é necessária.

## Validação
- Rodar `bun run build:dev` para garantir que as alterações de props e JSX não quebram a build.