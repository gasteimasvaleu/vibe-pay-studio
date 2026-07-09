## Objetivo

Preparar a dashboard para evoluir de forma independente para creator e assinante, e já reorganizar os cards do creator priorizando o que é essencial pra quem monetiza. Ajustes de assinante ficam para depois (quando você logar como assinante).

## O que muda

### 1. Separar em dois componentes

`src/routes/_authenticated/dashboard.tsx` mantém:
- `head()`, `beforeLoad` (toda a lógica de redirect de onboarding e contexto), `errorComponent`
- `component: DashboardPage` que só lê `accountType` do route context e renderiza:
  - `<CreatorDashboard />` se creator
  - `<SubscriberDashboard />` caso contrário

Novos arquivos:
- `src/components/dashboard/CreatorDashboard.tsx`
- `src/components/dashboard/SubscriberDashboard.tsx`
- `src/components/dashboard/ActionCard.tsx` (extrai o `ActionCard` atual, compartilhado)
- `src/components/dashboard/DashboardShell.tsx` (extrai o wrapper: background, gradiente radial, grid pattern, header com botão voltar + título + link Feed, cabeçalho do perfil com avatar/nome/@/link "Ver perfil público") — usado pelos dois

Ambos consomem o `Route.useRouteContext()` via props passadas pelo `DashboardPage` (ou re-lêem o contexto — usar props deixa mais explícito e testável).

### 2. Reorganizar cards do CreatorDashboard

Nova ordem, em grupos visuais com um pequeno subtítulo cada:

**Meu negócio** (prioridade máxima do creator)
1. Publicar — `PenSquare`
2. Assinantes — `Users`
3. Ganhos — `DollarSign`
4. Carteira — `Wallet`

**Comunicação**
5. Chat — `MessageCircle`

**Conta**
6. Perfil — `User`
7. Atividades — `Bookmark`
8. Definições — `Settings`
9. Ajuda — `HelpCircle`
10. Sair — `LogOut` (tone danger)

Removidos do creator: "Assinaturas" (creators que eu sigo) — pouco relevante pra creator no MVP e você indicou que veremos assinante depois. Pode voltar mais tarde se fizer sentido.

Nada de métricas/resumo no topo agora — você disse que virão instruções aos poucos.

### 3. SubscriberDashboard (mínimo viável, sem mexer no comportamento atual)

Mantém exatamente os mesmos cards que hoje aparecem para `!isCreator`, na mesma ordem, só extraídos pro novo componente. Assim quando você logar como assinante nada muda visualmente e a gente evolui depois.

### 4. Sem mudanças em

- `beforeLoad`, redirects de onboarding, tipos de conta, Supabase
- Rotas, navegação, `+` do chat, agendamento
- Estilo global, tokens, cores — só reorganização de cards e agrupamento com `<h4 className="text-xs uppercase tracking-wider text-white/40">` acima de cada grupo

## Detalhes técnicos

- `ActionCard` fica idêntico ao atual (props `icon`, `title`, `description`, `tone`, `onClick`, `disabled`, `to`, `highlight`).
- Grupos: cada bloco é `<section className="space-y-3"><h4>…</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4">…cards…</div></section>`, e as sections empilhadas com `space-y-6`.
- Sign-out permanece no CreatorDashboard e SubscriberDashboard (cada um chama `supabase.auth.signOut()` — ou extraímos pra `useSignOut()` em `src/hooks/`, opcional).
- Tipos de props: `CreatorDashboardProps { username: string }`, `SubscriberDashboardProps { username: string; creatorNextStep: string; creatorOnboardingStarted: boolean }`.

## Fora de escopo (fica pra próximas mensagens)

- Métricas/resumo no topo do creator
- Ajustes específicos do assinante
- Cards de destino real (`to=`) para Publicar/Assinantes/Ganhos/Carteira etc. — hoje são placeholders sem rota; continuam como botão sem ação até você pedir cada tela.
