## Objetivo
Ajustar o background das páginas da carteira (`/mywallet`, `/mywallet/extrato`, `/mywallet/recarregar`) para usar o padrão do restante do app (`bg-background` com header `bg-background/90 backdrop-blur`), corrigindo a diferença visual reportada.

## Estado atual verificado
- `src/routes/_authenticated/mywallet.index.tsx` (linhas 200–203): usa `<div className="absolute inset-0 bg-card" />` e `header bg-card`.
- `src/routes/_authenticated/mywallet.extrato.tsx` (linhas 173–176): mesmo padrão de fundo `bg-card`.
- `src/routes/_authenticated/mywallet.recarregar.tsx` (linhas 93–96): mesmo padrão de fundo `bg-card`.
- Páginas de referência como `/banco` e `/follow` usam `min-h-screen bg-background` e `header bg-background/90 backdrop-blur`.

## Alterações propostas
1. Em cada um dos três arquivos de rota da carteira:
   - Substituir o wrapper `relative min-h-screen text-foreground overflow-hidden` + `absolute inset-0 bg-card` por `min-h-screen bg-background text-foreground`.
   - Substituir o header `relative z-10 border-b border-border bg-card` por `sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur`.
   - Remover classes `relative z-10` desnecessárias do `<main>` (o sticky header já resolve o empilhamento).

## Arquivos afetados
- `src/routes/_authenticated/mywallet.index.tsx`
- `src/routes/_authenticated/mywallet.extrato.tsx`
- `src/routes/_authenticated/mywallet.recarregar.tsx`

## Validação
Após a alteração, verificar visualmente no preview que as três rotas da carteira exibem o mesmo fundo e comportamento de header das páginas `/banco` e `/follow`, tanto no tema claro quanto no escuro.