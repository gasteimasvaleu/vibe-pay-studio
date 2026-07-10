## Objetivo
Criar a página **Extrato** dentro de `/mywallet`, acessada ao clicar no card "Saldo na carteira" (chevron à direita) — e também no botão "Ver todas as transações". Layout conforme screenshots: header, 3 filtros (Tipo de item, Tipo de movimentação, intervalo de datas) e "Últimas movimentações" com estado vazio.

## Rota
- **novo** `src/routes/_authenticated/mywallet.extrato.tsx` → URL `/mywallet/extrato`
  - `head()`: `title: "Extrato · Monetisex"`, `robots: noindex`
  - Header padrão (voltar via `router.history.back()` + título "Extrato"), mesmo estilo das outras páginas.

## Wiring em `/mywallet`
- **editar** `src/routes/_authenticated/mywallet.tsx`:
  - Envolver o conteúdo do card "Saldo na carteira" num `<Link to="/mywallet/extrato">` (mantém o mesmo visual, torna o card todo clicável). O botão **Recarregar** interno continua com `onClick={soon}` + `e.stopPropagation()` / `e.preventDefault()` para não abrir o extrato.
  - Ligar o botão "Ver todas as transações" via `<Link to="/mywallet/extrato">` (substituindo `onClick={soon}`).

## Conteúdo `/mywallet/extrato`

### Barra de filtros
Grid `grid-cols-1 md:grid-cols-3 gap-3`, todos os controles pill (`h-12 rounded-full`):

1. **Tipo de item** — `Popover` acionado por botão outline pill mostrando "Tipo de item" + `ChevronDown`. Ao abrir, `PopoverContent` mostra chips clicáveis: **Todos, Depósito, Bônus promocional, Estorno** (usar o mesmo estilo do componente `Chip` já existente ou botões pill `bg-secondary text-secondary-foreground`). Selecionar fecha o popover e atualiza o label do botão.
2. **Tipo de movimentação** — mesmo padrão, opções: **Todos, Entradas, Saídas**.
3. **Intervalo de datas** — botão outline pill com ícone `Calendar` + "Data inicial" + "Até" + "Data final". Ao clicar, abre `Popover` contendo `Calendar` (shadcn) em `mode="range"` com `numberOfMonths={2}` e `pointer-events-auto`. Valores selecionados atualizam os labels formatados (`date-fns` `format(..., "dd/MM/yyyy")`).

### Seção "Últimas movimentações"
- Título `Últimas movimentações` (`text-lg font-bold`).
- Card grande (`rounded-2xl border border-border bg-card p-8`) com estado vazio centralizado: "Nenhuma transação encontrada" (`text-muted-foreground`).

## Detalhes técnicos
- Uso de shadcn `Popover`, `PopoverContent`, `PopoverTrigger`, `Calendar`, `Button`.
- Ícones lucide: `ArrowLeft`, `ChevronDown`, `Calendar`.
- `date-fns` já disponível (usado em outras páginas).
- Estado local para `tipoItem`, `tipoMovimentacao`, `dateRange: DateRange | undefined`.
- Tudo mock, sem dados reais.

## Arquivos alterados/criados
- **novo** `src/routes/_authenticated/mywallet.extrato.tsx`
- **editar** `src/routes/_authenticated/mywallet.tsx` (card do saldo + botão "Ver todas as transações" viram `Link` para `/mywallet/extrato`)
