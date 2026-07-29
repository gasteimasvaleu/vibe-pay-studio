## Objetivo
Reduzir a densidade visual do dashboard (creator e subscriber) para uma aparência mais sutil e delicada, sem alterar funcionalidade. As alterações são puramente de presentation (tipografia e padding), sem mudanças de lógica.

## Arquivos e mudanças

### 1. `src/components/dashboard/EarningsSummary.tsx` (cards Faturamento / Liberado / Total)
- Padding: `p-5` → `p-4`
- Título ("Faturamento", "Liberado", "Total"): `text-lg font-bold` → `text-sm font-semibold`
- Subtítulo ("Hoje", "Valor disponível…"): `text-sm` → `text-xs`
- Valor grande ("R$ —"): `text-3xl font-bold` → `text-xl font-semibold`
- Skeleton: `h-8 w-28` → `h-6 w-20`
- Gap do grid: `gap-4` → `gap-3`

### 2. `src/components/dashboard/ActionCard.tsx` (cards da "Área do Criador")
- Padding: `p-5` → `p-4`
- Ícone container: `h-10 w-10 rounded-xl` → `h-9 w-9 rounded-lg`
- Ícone interno (via prop nos usos): manter `h-5 w-5` (opcional reduzir para `h-4 w-4` — sugestão: manter)
- Título: `text-base font-semibold` → `text-sm font-semibold`
- Descrição: `mt-3 text-sm` → `mt-2 text-xs`

### 3. `src/components/dashboard/ProfileHeaderCard.tsx` (card do perfil no topo)
- Faixa gradiente: `h-24` → `h-20`
- Avatar: `h-20 w-20` + `-mt-10` → `h-16 w-16` + `-mt-8`; fallback texto `text-2xl` → `text-xl`
- Nome: `text-2xl font-bold` → `text-lg font-semibold`
- Badge check: `h-5 w-5` → `h-4 w-4`
- Handle e stat label: `text-sm` → `text-xs`
- Stat valor: `text-lg font-bold` → `text-sm font-semibold`
- Level badge (+100°): `px-3 py-1 text-sm` → `px-2.5 py-0.5 text-xs`
- Padding corpo: `px-5 pb-5/pb-4` → `px-4 pb-4/pb-3`
- Link "Ver perfil": manter `text-sm` (compacto o suficiente) ou reduzir para `text-xs` — proposta: `text-xs`

### 4. `src/components/dashboard/DashboardShell.tsx` — títulos de grupo
- Verificar o `DashboardGroup` (título "Área do Criador"/"Outras Funcionalidades") e reduzir de estilo grande para `text-base font-semibold` se estiver maior. (Confirmar ao abrir o arquivo em build mode.)

## Não incluso
- Sem mudança em cores, tokens do design system, rotas, dados ou funções server.
- Sem alteração no BottomNav, TopNav ou switch bar (a switch bar já parece proporcional na referência).

## Verificação
- Rodar typecheck.
- Capturar screenshot do `/dashboard` via Playwright autenticado e comparar com a referência anexada.