## Objetivo
Criar a página **Carteira** (rota `/mywallet`) acessada ao clicar no card "Carteira" do dashboard do creator. Layout conforme screenshots: saldo, Meus Cartões, Últimas Transações.

## Rota
- **novo** `src/routes/_authenticated/mywallet.tsx` → URL `/mywallet`
  - `head()`: `title: "Carteira · Monetisex"`, `robots: noindex`
  - Header padrão (voltar + título "Carteira") no estilo `/banco` (fundo `--gradient-radial`, `border-b border-border backdrop-blur-md bg-card/80`, container `max-w-3xl mx-auto`).

## Conteúdo

### 1. Card "Saldo na carteira"
Card grande arredondado (`rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]`) com layout flex entre conteúdo e `ChevronRight`:
- Label pequeno "Saldo na carteira"
- Valor grande `R$ -` (mock)
- Descrição: "Recarregue a sua carteira e compre conteúdos de forma simples e fácil"
- Botão pill primário **Recarregar** (`bg-gradient-primary text-primary-foreground rounded-full`)
- `ChevronRight` à direita, alinhado verticalmente

### 2. Seção "Meus Cartões"
- Título `Meus Cartões`
- Grid `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4`
- Card único "Adicionar novo cartão" (aspect-square, borda tracejada, ícone `Plus` no topo, título "Adicionar novo cartão" em duas linhas)
- Reaproveita o mesmo estilo do card "Adicionar novo banco" em `/banco`

### 3. Divisor + Seção "Últimas Transações"
- `<hr className="border-border" />`
- Título `Últimas Transações`
- Estado vazio centralizado: texto em `text-muted-foreground` "Nenhuma transação encontrada"
- Botão outline pill "Ver todas as transações" (`variant="outline" className="rounded-full text-primary border-primary"`) — sem destino ainda

## Wiring
- **editar** `src/components/dashboard/CreatorDashboard.tsx` — no `ActionCard` "Carteira" (linhas 89-93) adicionar `to="/mywallet"`.

## Detalhes técnicos
- Tudo estático/mock, sem chamadas Supabase.
- Botão "Recarregar" e "Adicionar novo cartão" apenas mostram `toast("Em breve")` no clique (sonner).
- Ícones lucide: `ArrowLeft`, `ChevronRight`, `Plus`.
- Sem novas dependências.

## Arquivos alterados/criados
- **novo** `src/routes/_authenticated/mywallet.tsx`
- **editar** `src/components/dashboard/CreatorDashboard.tsx`
