## Objetivo
Ajustar os cards de ação (`ActionCard`) em `CreatorDashboard` para ficar com a mesma aparência dos cards de Faturamento/Liberado/Total: fundo branco (`bg-card`), borda fina (`border`) e sombra suave (`shadow-card`).

## Escopo
- Aplicar a todos os cards do dashboard: **Área do Criador** e **Outras Funcionalidades** (incluindo o card de Sair).
- Manter os comportamentos existentes: navegação, estado `disabled`, clique no Sair e variação de tom `danger`.
- Não mexer no `EarningsSummary` nem no `DashboardShell`, pois a referência visual já está neles.

## Alterações planejadas

### 1. Revisar estilos do `ActionCard.tsx`
- Substituir o visual "glass dark" por tokens claros do tema:
  - `bg-white/5` → `bg-card`
  - `border-white/10` → `border` (usando `--color-border`)
  - `backdrop-blur-md` → remover
  - `shadow-[var(--shadow-card)]` → adicionar sombra consistente com os cards de faturamento
- Ajustar os estados hover:
  - `hover:border-white/25` → `hover:border-primary/40` ou `hover:ring-1 hover:ring-primary/20`
  - `hover:bg-white/10` → remover ou usar `hover:bg-accent`
- Ajustar o container do ícone:
  - `bg-white/5` → `bg-secondary/60` ou `bg-primary/10`
  - `border-white/10` → `border`
  - `text-fuchsia-300` → `text-primary`
- Ajustar textos:
  - título → `text-card-foreground`
  - descrição → `text-muted-foreground`
- Ajustar o estado `danger` para combinar com o novo fundo claro:
  - manter `tone="danger"` com cores destrutivas/acento primário sem ficar gritante demais no fundo branco
- Ajustar `highlight` (se ainda existir) para não conflitar com o novo visual; considerar removê-lo se não for usado.

### 2. Verificar `CreatorDashboard.tsx`
- Confirmar que `highlight` não é passado para nenhum `ActionCard` (o resumo da última mensagem diz que foi removido). Se ainda estiver, removê-lo.
- Manter `disabled`, `tone="danger"`, `to` e `onClick` como estão.

### 3. Validar visual
- Comparar os cards de ação com os cards do `EarningsSummary` no preview.
- Confirmar que o contraste de ícone, título e descrição continua legível no fundo branco.

## Arquivos alterados
- `src/components/dashboard/ActionCard.tsx` (estilos)
- `src/components/dashboard/CreatorDashboard.tsx` (apenas se houver limpeza de `highlight`)

## Fora do escopo
- Não criar novas rotas nem funcionalidades para os cards.
- Não alterar os cards de faturamento (jão estão no estilo desejado).
- Não mudar a estrutura do dashboard, apenas os tokens de cor.