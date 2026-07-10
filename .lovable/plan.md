## Objetivo
Criar a página **Recarregar carteira** dentro de `/mywallet`, acessada ao clicar no botão "Recarregar" do card de saldo. Layout conforme screenshots: seletor de valor com −/+, slider, resumo (Saldo atual / Você adiciona / Saldo final) e CTA "Continuar" fixado no rodapé.

## Rota
- **novo** `src/routes/_authenticated/mywallet.recarregar.tsx` → URL `/mywallet/recarregar`
  - `head()`: `title: "Recarregar carteira · Monetisex"`, `robots: noindex`
  - Header padrão (voltar + título "Recarregar carteira"), mesmo estilo das outras páginas.

## Wiring em `/mywallet`
- **editar** `src/routes/_authenticated/mywallet.tsx` — trocar o botão "Recarregar":
  - Remover `onClick={soon}` e o `preventDefault/stopPropagation`.
  - Usar `<Button asChild>` com `<Link to="/mywallet/recarregar" onClick={(e) => e.stopPropagation()}>Recarregar</Link>` (o `stopPropagation` mantém o clique no botão sem também acionar o Link exterior do card, que aponta para `/mywallet/extrato`).

## Conteúdo `/mywallet/recarregar`

### Seletor de valor (topo, centralizado)
- Estado local `amount: number` (default `50`), min `10`, max `1000`, step `10`.
- Layout: `flex items-center justify-center gap-4 mt-16`
  - Botão circular `−` (`h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center`) → decrementa `step`
  - Valor grande `text-4xl md:text-5xl font-extrabold tracking-tight` formatado como `R$ {valor,fixed(2)}` com vírgula (usar `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`)
  - Botão circular `+` (mesmo estilo) → incrementa
- Botões desabilitam nos limites.

### Slider
- Componente shadcn `Slider` (`min={10} max={1000} step={10}`) espelhando `amount`.
- `className="mt-8"`, cor do track/thumb via classes existentes do componente (já usa `--primary`).

### Resumo
- Título `Resumo` (`text-lg font-bold mt-10`)
- Lista de linhas com divisor `border-b border-border` entre elas:
  - `Saldo atual` → `R$ -`
  - `Você adiciona` → valor formatado
  - `Saldo final` → mesmo valor (saldo atual é `-`, então só mostra o novo)
- Layout de cada linha: `flex justify-between py-4 text-sm md:text-base font-semibold text-foreground`

### CTA "Continuar"
- Botão largo pill primário fixado abaixo do resumo com `mt-10 w-full h-12 rounded-full bg-gradient-primary text-primary-foreground`.
- `onClick` mostra `toast.success("Em breve")` e volta com `router.history.back()`.

## Detalhes técnicos
- Componentes shadcn: `Button`, `Slider`.
- Ícones lucide: `ArrowLeft`, `Minus`, `Plus`.
- Sonner `toast` já configurado.
- Sem dados persistentes / sem backend.

## Arquivos alterados/criados
- **novo** `src/routes/_authenticated/mywallet.recarregar.tsx`
- **editar** `src/routes/_authenticated/mywallet.tsx` (botão "Recarregar" vira `Link` para `/mywallet/recarregar`)
